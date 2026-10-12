import { setupDb, testDb, schema, seedCharity } from "./_harness";
import { before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import type Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { handleStripeEvent } from "../../lib/stripe-webhook";
import { parseGiveawayDraft } from "../../lib/giveaways/validation";
import {
  confirmEntrant,
  createDonationIntent,
  createDraft,
  goLive,
  submitEntry,
} from "../../lib/giveaways/service";
import { issueEntrantToken, issueFormToken } from "../../lib/giveaways/tokens";
import { completeDraw, lockPool, type DrandClient } from "../../lib/giveaways/draw";
import { reconcilePendingDonations } from "../../lib/giveaways/reconcile";

const NY = "America/New_York";
const T0 = new Date("2026-11-02T15:00:00Z");
const DURING = new Date("2026-11-05T16:00:00Z");
const DRAW_AT = new Date("2026-11-14T06:00:00Z");

before(async () => {
  await setupDb();
  process.env.GIVEAWAYS_ADMIN_ADDRESS = "100 Test Ave, Austin, TX 78701";
  process.env.STRIPE_SECRET_KEY = "sk_test_unused";
});

async function stripeCharity(slug: string, account: string) {
  const s = await seedCharity(slug);
  await testDb
    .update(schema.charities)
    .set({ stripeAccountId: account, stripeChargesEnabled: true })
    .where(eq(schema.charities.id, s.charity.id));
  return s;
}

async function donationGiveaway(slug: string, account: string) {
  const { charity, owner } = await stripeCharity(slug, account);
  const draft = parseGiveawayDraft(
    {
      prizeName: "A drum kit",
      prizeDescription: "A five-piece drum kit with cymbals and a throne.",
      prizeArv: "900",
      startDate: "2026-11-03",
      endDate: "2026-11-12",
      timezone: NY,
      freeEntriesPerDay: "1",
      perPersonCap: "10",
      donationsEnabled: true,
      dollarsPerEntry: "10",
      claimDeadlineDays: "7",
      sponsorLegalName: `${slug} Inc.`,
      sponsorStreet: "1 Main St",
      sponsorCity: "Austin",
      sponsorState: "TX",
      sponsorZip: "78701",
    },
    T0,
  );
  if (!draft.ok) throw new Error(JSON.stringify(draft.fieldErrors));
  const { id } = await createDraft({ charityId: charity.id, values: draft.values });
  const live = await goLive({
    charityId: charity.id,
    campaignId: id,
    userId: owner.id,
    attested: true,
    now: T0,
    origin: "https://yufora.test",
    entitled: true,
    goLiveOpen: true,
    stripeConfigured: true,
  });
  assert.equal(live.status, "live", JSON.stringify(live));
  return { charity, campaignId: id };
}

async function confirmedEntrant(campaignId: string, email: string) {
  await submitEntry({
    formToken: issueFormToken(campaignId, DURING.getTime() - 5000),
    honeypotFilled: false,
    raw: { firstName: "Ana", lastName: "Reyes", email, state: "TX", ageConfirm: "on", rulesAgree: "on", publicDisplay: false, marketing: false },
    ctx: { now: DURING, ip: "10.1.1.1" },
  });
  const [e] = await testDb
    .select()
    .from(schema.giveawayEntrants)
    .where(and(eq(schema.giveawayEntrants.campaignId, campaignId), eq(schema.giveawayEntrants.email, email)));
  const token = issueEntrantToken({ campaignId, entrantId: e.id, endsAt: new Date("2026-11-13T05:00:00Z") }, DURING.getTime());
  await confirmEntrant({ token, ctx: { now: DURING, ip: "10.1.1.1" } });
  return { entrant: e, token };
}

type Captured = { params: Stripe.Checkout.SessionCreateParams; opts: Stripe.RequestOptions };

function fakeStripe(sessionId: string, captured: Captured[]) {
  return {
    checkout: {
      sessions: {
        create: async (params: Stripe.Checkout.SessionCreateParams, opts: Stripe.RequestOptions) => {
          captured.push({ params, opts });
          return { id: sessionId, url: `https://checkout.stripe.test/${sessionId}` };
        },
      },
    },
  } as unknown as Pick<Stripe, "checkout">;
}

async function intent(token: string, amount: string, sessionId: string) {
  const captured: Captured[] = [];
  const r = await createDonationIntent({
    token,
    amountRaw: amount,
    ctx: { now: DURING, ip: "10.1.1.1" },
    stripeClient: fakeStripe(sessionId, captured),
  });
  assert.equal(r.status, "redirect", JSON.stringify(r));
  return captured[0];
}

function paidSession(c: Captured, overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id: c.params.metadata ? `cs_${(c.params.metadata as Record<string, string>).yuforaDonationId}` : "cs_x",
    object: "checkout.session",
    payment_status: "paid",
    status: "complete",
    mode: "payment",
    currency: "usd",
    amount_total: c.params.line_items![0].price_data!.unit_amount!,
    expires_at: c.params.expires_at!,
    metadata: c.params.metadata as Record<string, string>,
    payment_intent: `pi_${(c.params.metadata as Record<string, string>).yuforaDonationId}`,
    customer_details: { name: "Ana Reyes", email: "ana@example.com" },
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}

function completed(account: string | undefined, session: Stripe.Checkout.Session) {
  return handleStripeEvent({
    type: "checkout.session.completed",
    account,
    data: { object: session },
  } as unknown as Stripe.Event);
}

function refunded(account: string | undefined, pi: string) {
  return handleStripeEvent({
    type: "charge.refunded",
    account,
    data: { object: { payment_intent: pi } },
  } as unknown as Stripe.Event);
}

async function activeEntries(entrantId: string) {
  return (
    await testDb
      .select()
      .from(schema.giveawayEntries)
      .where(and(eq(schema.giveawayEntries.entrantId, entrantId), eq(schema.giveawayEntries.status, "active")))
  ).length;
}

async function contributionCount() {
  return (await testDb.select().from(schema.contributions)).length;
}

describe("bonus-entry donations", () => {
  test("intent first, then a session that expires before entries close", async () => {
    const { campaignId } = await donationGiveaway("intent", "acct_intent");
    const { token, entrant } = await confirmedEntrant(campaignId, "i@example.com");
    const c = await intent(token, "25", "cs_intent_1");
    assert.equal(c.opts.stripeAccount, "acct_intent");
    assert.equal(c.params.submit_type, "donate");
    assert.equal(c.params.customer_email, "i@example.com");
    assert.ok(c.params.expires_at! * 1000 <= Date.parse("2026-11-13T05:00:00Z"));
    assert.match(String(c.params.line_items![0].price_data!.product_data!.description), /No donation necessary/);
    const [row] = await testDb
      .select()
      .from(schema.giveawayDonations)
      .where(eq(schema.giveawayDonations.entrantId, entrant.id));
    assert.equal(row.status, "pending");
    assert.equal(row.amountCents, 2500);
    assert.equal(row.stripeCheckoutSessionId, "cs_intent_1");
  });

  test("refused: under the minimum, at the cap, or too close to the end", async () => {
    const { campaignId } = await donationGiveaway("refuse", "acct_refuse");
    const { token } = await confirmedEntrant(campaignId, "r@example.com");
    const small = await createDonationIntent({ token, amountRaw: "7", ctx: { now: DURING, ip: "1" }, stripeClient: fakeStripe("x", []) });
    assert.equal(small.status, "error");
    const late = await createDonationIntent({
      token,
      amountRaw: "20",
      ctx: { now: new Date("2026-11-13T04:40:00Z"), ip: "1" },
      stripeClient: fakeStripe("x", []),
    });
    assert.equal(late.status === "error" && /half an hour/.test(late.message), true);
  });

  test("the webhook credits floor(amount / rate), once", async () => {
    const before = await contributionCount();
    const { campaignId } = await donationGiveaway("credit", "acct_credit");
    const { token, entrant } = await confirmedEntrant(campaignId, "c@example.com");
    const c = await intent(token, "25", "cs_credit_1");
    const s = paidSession(c, { id: "cs_credit_1" });
    assert.match(await completed("acct_credit", s), /giveaway recorded/);
    assert.equal(await activeEntries(entrant.id), 1 + 2);
    assert.match(await completed("acct_credit", s), /duplicate/);
    assert.equal(await activeEntries(entrant.id), 3);
    assert.equal(await contributionCount(), before, "giveaway events never touch contributions");
  });

  test("forged and mismatched events credit nothing", async () => {
    const { campaignId } = await donationGiveaway("forge", "acct_forge");
    const other = await donationGiveaway("forge-other", "acct_other");
    const { token, entrant } = await confirmedEntrant(campaignId, "f@example.com");
    const c = await intent(token, "30", "cs_forge_1");
    const s = paidSession(c, { id: "cs_forge_1" });
    const meta = s.metadata as Record<string, string>;

    assert.match(await completed("acct_other", s), /does not match charity/);
    assert.match(await completed(undefined, s), /does not match charity/);
    // A sponsor-made session with no Yufora intent behind it.
    assert.match(
      await completed("acct_forge", { ...s, id: "cs_crafted", metadata: { ...meta, yuforaDonationId: crypto.randomUUID() } }),
      /no Yufora-created intent/,
    );
    // Another charity's campaign, sent from this charity's account.
    assert.match(
      await completed("acct_forge", { ...s, metadata: { ...meta, yuforaCampaignId: other.campaignId } }),
      /campaign not owned/,
    );
    assert.match(
      await completed("acct_forge", { ...s, metadata: { ...meta, yuforaEntrantId: crypto.randomUUID() } }),
      /entrant not in campaign/,
    );
    assert.match(await completed("acct_forge", { ...s, amount_total: 100000 }), /amount mismatch/);
    assert.equal(await activeEntries(entrant.id), 1);
  });

  test("over the cap credits what's left and says why", async () => {
    const { campaignId } = await donationGiveaway("cap", "acct_cap");
    const { token, entrant } = await confirmedEntrant(campaignId, "cap@example.com");
    const c = await intent(token, "500", "cs_cap_1");
    await completed("acct_cap", paidSession(c, { id: "cs_cap_1" }));
    assert.equal(await activeEntries(entrant.id), 10);
    const [d] = await testDb.select().from(schema.giveawayDonations).where(eq(schema.giveawayDonations.entrantId, entrant.id));
    assert.equal(d.entriesCredited, 9);
    assert.equal(d.creditNote, "cap_reached");
  });

  test("a session that could outlive the entry period earns nothing", async () => {
    const { campaignId } = await donationGiveaway("late", "acct_late");
    const { token, entrant } = await confirmedEntrant(campaignId, "late@example.com");
    const c = await intent(token, "20", "cs_late_1");
    const lateExpiry = Date.parse("2026-11-13T05:00:00Z") / 1000 + 60;
    await completed("acct_late", paidSession(c, { id: "cs_late_1", expires_at: lateExpiry }));
    assert.equal(await activeEntries(entrant.id), 1);
  });

  test("a refund before the lock voids only that gift's entries", async () => {
    const { campaignId } = await donationGiveaway("refund", "acct_refund");
    const { token, entrant } = await confirmedEntrant(campaignId, "rf@example.com");
    const a = await intent(token, "20", "cs_refund_a");
    const b = await intent(token, "30", "cs_refund_b");
    const sa = paidSession(a, { id: "cs_refund_a" });
    await completed("acct_refund", sa);
    await completed("acct_refund", paidSession(b, { id: "cs_refund_b" }));
    assert.equal(await activeEntries(entrant.id), 1 + 2 + 3);
    assert.match(await refunded("acct_other_acct", String(sa.payment_intent)), /account mismatch/);
    assert.match(await refunded("acct_refund", String(sa.payment_intent)), /refunded\+voided/);
    assert.equal(await activeEntries(entrant.id), 1 + 3);
    assert.match(await refunded("acct_refund", String(sa.payment_intent)), /duplicate/);
  });
});

describe("after the lock", () => {
  const drand: DrandClient = {
    fetchLatest: async () => ({ round: 1, randomness: "", signature: "" }),
    fetchRound: async (round) => {
      const signature = createHash("sha256").update(`r${round}`).digest("hex") + "cd".repeat(16);
      return { round, signature, randomness: createHash("sha256").update(Buffer.from(signature, "hex")).digest("hex") };
    },
    verifySignature: () => true,
  };

  test("a refund after the draw is logged; the pool and result don't move", async () => {
    const { campaignId, charity } = await donationGiveaway("postlock", "acct_post");
    const { token, entrant } = await confirmedEntrant(campaignId, "pl@example.com");
    const c = await intent(token, "40", "cs_post_1");
    const s = paidSession(c, { id: "cs_post_1" });
    await completed("acct_post", s);
    await lockPool({ campaignId, charityId: charity.id, userId: null, now: DRAW_AT, drand, reconcile: async () => {} });
    await completeDraw({ campaignId, drand, waitBudgetMs: 1000 });
    const [before] = await testDb.select().from(schema.giveawayDraws).where(eq(schema.giveawayDraws.campaignId, campaignId));
    assert.match(await refunded("acct_post", String(s.payment_intent)), /after lock/);
    assert.equal(await activeEntries(entrant.id), 5);
    const [after] = await testDb.select().from(schema.giveawayDraws).where(eq(schema.giveawayDraws.campaignId, campaignId));
    assert.deepEqual(after.results, before.results);
  });

  test("pending donations are reconciled with Stripe before the lock — or the lock refuses", async () => {
    const { campaignId, charity } = await donationGiveaway("recon", "acct_recon");
    const { token, entrant } = await confirmedEntrant(campaignId, "rc@example.com");
    const c = await intent(token, "20", "cs_recon_1");
    const down = await lockPool({
      campaignId,
      charityId: charity.id,
      userId: null,
      now: DRAW_AT,
      drand,
      reconcile: async () => {
        throw new Error("stripe unreachable");
      },
    });
    assert.equal(down.status === "error" && down.code, "pending_donations");

    const r = await reconcilePendingDonations(campaignId, async () => paidSession(c, { id: "cs_recon_1" }));
    assert.deepEqual(r, { resolved: 1, stillPending: 0 });
    assert.equal(await activeEntries(entrant.id), 1 + 2);
    const ok = await lockPool({ campaignId, charityId: charity.id, userId: null, now: DRAW_AT, drand, reconcile: async () => {} });
    assert.equal(ok.status, "locked");
  });
});

describe("product donations are unchanged", () => {
  test("a product checkout still records a contribution and funds the item; refunds roll back", async () => {
    const { charity } = await stripeCharity("products", "acct_products");
    const [product] = await testDb
      .insert(schema.products)
      .values({ charityId: charity.id, title: "Keyboard", goalCents: 50000, status: "published" })
      .returning();
    const session = {
      id: "cs_product_1",
      payment_status: "paid",
      amount_total: 2500,
      metadata: { yuforaProductId: product.id, yuforaCharityId: charity.id },
      payment_intent: "pi_product_1",
      customer_details: { name: "D", email: "d@example.com" },
    } as unknown as Stripe.Checkout.Session;
    assert.match(await completed("acct_products", session), /^recorded:/);
    const [p1] = await testDb.select().from(schema.products).where(eq(schema.products.id, product.id));
    assert.equal(p1.fundedCents, 2500);
    assert.match(await refunded("acct_products", "pi_product_1"), /^refunded:/);
    const [p2] = await testDb.select().from(schema.products).where(eq(schema.products.id, product.id));
    assert.equal(p2.fundedCents, 0);
  });
});
