import { setupDb, testDb, schema, seedCharity } from "./_harness";
import { before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { parseGiveawayDraft } from "../../lib/giveaways/validation";
import {
  claimDailyEntry,
  confirmEntrant,
  createDraft,
  goLive,
  markPrizeAwarded,
  promoteNextAlternate,
  respondToClaim,
  submitEntry,
  updateDraft,
} from "../../lib/giveaways/service";
import { completeDraw, lockPool, type DrandClient } from "../../lib/giveaways/draw";
import { issueClaimToken, issueEntrantToken, issueFormToken } from "../../lib/giveaways/tokens";
import { canonicalPool, rankPool, seedCommit, verifyDraw } from "../../lib/giveaways/draw-core";
import { hit } from "../../lib/throttle";
import { selectPool } from "../../lib/giveaways/ledger";
import {
  PUBLIC_GIVEAWAY_KEYS,
  entrantsToCsv,
  getEntrantsExport,
  getLatestEntrants,
  getPublicGiveaway,
} from "../../lib/data/giveaways";

const NY = "America/New_York";
const T_DRAFT = new Date("2026-11-02T15:00:00Z");
const DAY = 86_400_000;
const ip = (n: number) => ({ ip: `10.0.0.${n}`, ipCountry: "US" });

before(async () => {
  await setupDb();
});

test("go-live is refused while the Rules still have blanks", async () => {
  const { charity, owner } = await seedCharity("blanks");
  const { id } = await createDraft({ charityId: charity.id, values: draft() });
  const r = await goLive({ charityId: charity.id, campaignId: id, userId: owner.id, attested: true, ...liveCtx });
  assert.equal(r.status === "error" && r.code, "rules_incomplete");
  process.env.GIVEAWAYS_ADMIN_ADDRESS = "100 Test Ave, Austin, TX 78701";
});

function draft(overrides: Record<string, unknown> = {}) {
  const r = parseGiveawayDraft(
    {
      prizeName: "A handmade acoustic guitar",
      prizeDescription: "A solid-top acoustic guitar with a hard case, made in Austin.",
      prizeArv: "1200",
      startDate: "2026-11-03",
      endDate: "2026-11-12",
      timezone: NY,
      freeEntriesPerDay: "1",
      perPersonCap: "10",
      donationsEnabled: false,
      dollarsPerEntry: "",
      claimDeadlineDays: "7",
      sponsorLegalName: "Test Foundation, Inc.",
      sponsorStreet: "1 Main St",
      sponsorCity: "Austin",
      sponsorState: "TX",
      sponsorZip: "78701",
      ...overrides,
    },
    T_DRAFT,
  );
  if (!r.ok) throw new Error(JSON.stringify(r.fieldErrors));
  return r.values;
}

const liveCtx = {
  now: T_DRAFT,
  origin: "https://yufora.test",
  entitled: true,
  goLiveOpen: true,
  stripeConfigured: false,
};

async function liveGiveaway(slug: string, overrides: Record<string, unknown> = {}) {
  const { charity, owner } = await seedCharity(slug);
  const { id } = await createDraft({ charityId: charity.id, values: draft(overrides) });
  const r = await goLive({ charityId: charity.id, campaignId: id, userId: owner.id, attested: true, ...liveCtx });
  assert.equal(r.status, "live", JSON.stringify(r));
  return { charity, owner, campaignId: id };
}

async function enter(campaignId: string, email: string, at: Date, extra: Record<string, unknown> = {}, n = 1) {
  const formToken = issueFormToken(campaignId, at.getTime() - 5000);
  return submitEntry({
    formToken,
    honeypotFilled: false,
    raw: {
      firstName: "Ana",
      lastName: "Reyes",
      email,
      state: "TX",
      ageConfirm: "on",
      rulesAgree: "on",
      publicDisplay: true,
      marketing: false,
      ...extra,
    },
    ctx: { now: at, ...ip(n) },
  });
}

async function entrantByEmail(campaignId: string, norm: string) {
  const [e] = await testDb
    .select()
    .from(schema.giveawayEntrants)
    .where(and(eq(schema.giveawayEntrants.campaignId, campaignId), eq(schema.giveawayEntrants.emailNormalized, norm)));
  return e;
}

async function entryCount(entrantId: string) {
  return (await testDb.select().from(schema.giveawayEntries).where(eq(schema.giveawayEntries.entrantId, entrantId))).length;
}

function tokenFor(campaignId: string, entrantId: string, at: Date) {
  return issueEntrantToken({ campaignId, entrantId, endsAt: new Date("2026-11-13T05:00:00Z") }, at.getTime());
}

function fakeBeacon(round: number) {
  const signature = createHash("sha256").update(`sig-${round}`).digest("hex") + "ab".repeat(16);
  const randomness = createHash("sha256").update(Buffer.from(signature, "hex")).digest("hex");
  return { round, signature, randomness };
}

function mockDrand(opts: { available?: () => boolean } = {}): DrandClient {
  return {
    fetchLatest: async () => fakeBeacon(1),
    fetchRound: async (r) => ((opts.available?.() ?? true) ? fakeBeacon(r) : null),
    verifySignature: () => true,
  };
}

describe("going live", () => {
  test("refused when closed, unentitled, unattested, or failing parity", async () => {
    const { charity, owner } = await seedCharity("refusals");
    const { id } = await createDraft({ charityId: charity.id, values: draft({ perPersonCap: "11" }) });
    const base = { charityId: charity.id, campaignId: id, userId: owner.id, attested: true, ...liveCtx };

    const parity = await goLive(base);
    assert.equal(parity.status, "error");
    if (parity.status === "error" && parity.code === "checks") {
      assert.equal(parity.checks.find((c) => c.key === "parity")?.ok, false);
    }
    await updateDraft({ charityId: charity.id, campaignId: id, values: draft() });

    const closed = await goLive({ ...base, goLiveOpen: false });
    assert.equal(closed.status === "error" && closed.code === "checks" && closed.checks[0].ok, false);
    const unpaid = await goLive({ ...base, entitled: false });
    assert.equal(unpaid.status === "error" && unpaid.code, "checks");
    const unattested = await goLive({ ...base, attested: false });
    assert.equal(unattested.status === "error" && unattested.code, "attest");

    const withDonations = await createDraft({
      charityId: charity.id,
      values: draft({ donationsEnabled: true, dollarsPerEntry: "10" }),
    });
    const noStripe = await goLive({ ...base, campaignId: withDonations.id });
    assert.ok(noStripe.status === "error" && noStripe.code === "checks" && noStripe.checks.some((c) => c.key === "stripe" && !c.ok));
  });

  test("freezes config, rules and commitment", async () => {
    const { charity, campaignId } = await liveGiveaway("frozen");
    const [c] = await testDb.select().from(schema.giveawayCampaigns).where(eq(schema.giveawayCampaigns.id, campaignId));
    assert.equal(c.status, "live");
    assert.equal(seedCommit(c.serverSeed!), c.seedCommit);
    assert.match(c.rulesText!, new RegExp(c.seedCommit!));
    assert.equal(c.publicOrigin, "https://yufora.test");
    const again = await updateDraft({ charityId: charity.id, campaignId, values: draft({ prizeName: "Changed" }) });
    assert.equal(again, "locked");
  });

  test("another charity can't touch it", async () => {
    const { campaignId } = await liveGiveaway("owned");
    const { charity: other } = await seedCharity("intruder");
    assert.equal(await updateDraft({ charityId: other.id, campaignId, values: draft() }), "locked");
  });
});

describe("entering", () => {
  test("the full free-entry loop", async () => {
    const { campaignId } = await liveGiveaway("loop");
    const day1 = new Date("2026-11-03T16:00:00Z");

    const ri = await enter(campaignId, "ri@example.com", day1, { state: "RI" });
    assert.equal(ri.status, "error");
    if (ri.status === "error" && ri.code === "invalid") assert.match(ri.fieldErrors.state, /Rhode Island/);

    const first = await enter(campaignId, "Ana.Reyes@gmail.com", day1);
    assert.equal(first.status, "success");
    const ana = await entrantByEmail(campaignId, "anareyes@gmail.com");
    assert.ok(ana);
    assert.equal(ana.confirmedAt, null);
    assert.equal(await entryCount(ana.id), 1);

    // Same inbox, different spelling: same reply, no new entrant, no new entry.
    const dup = await enter(campaignId, "anareyes+gw@gmail.com", day1, { firstName: "Mallory" });
    assert.equal(dup.status, "success");
    const again = await entrantByEmail(campaignId, "anareyes@gmail.com");
    assert.equal(again.firstName, "Ana");
    assert.equal(await entryCount(ana.id), 1);

    // Unconfirmed: no daily claim, and not in the pool.
    const tok = tokenFor(campaignId, ana.id, day1);
    assert.equal((await claimDailyEntry({ token: tok, ctx: { now: day1, ...ip(1) } })).status, "unconfirmed");
    const [c0] = await testDb.select().from(schema.giveawayCampaigns).where(eq(schema.giveawayCampaigns.id, campaignId));
    assert.equal((await selectPool(testDb as never, c0)).length, 0);

    assert.equal((await confirmEntrant({ token: tok, ctx: { now: day1, ...ip(1) } })).status, "confirmed");
    assert.equal((await confirmEntrant({ token: tok, ctx: { now: day1, ...ip(1) } })).status, "already");
    assert.equal((await selectPool(testDb as never, c0)).length, 1);

    // Same local day: already used. Next local day: one more.
    assert.equal((await claimDailyEntry({ token: tok, ctx: { now: new Date("2026-11-04T04:30:00Z"), ...ip(1) } })).status, "already_today");
    const d2 = await claimDailyEntry({ token: tok, ctx: { now: new Date("2026-11-04T05:30:00Z"), ...ip(1) } });
    assert.deepEqual(d2, { status: "added", inserted: 1, total: 2 });

    // Every remaining day reaches exactly the cap, never more.
    for (let d = 2; d <= 9; d++) {
      const at = new Date(Date.parse("2026-11-03T16:00:00Z") + d * DAY);
      assert.equal((await claimDailyEntry({ token: tok, ctx: { now: at, ...ip(1) } })).status, "added", `day ${d}`);
    }
    assert.equal(await entryCount(ana.id), 10);
    assert.equal((await claimDailyEntry({ token: tok, ctx: { now: new Date("2026-11-12T20:00:00Z"), ...ip(1) } })).status, "already_today");
    assert.equal((await claimDailyEntry({ token: tok, ctx: { now: new Date("2026-11-13T06:00:00Z"), ...ip(1) } })).status, "closed");
  });

  test("tokens, exclusions and closed periods", async () => {
    const { campaignId } = await liveGiveaway("guards");
    const at = new Date("2026-11-05T16:00:00Z");
    const noToken = await submitEntry({ formToken: null, honeypotFilled: false, raw: {}, ctx: { now: at, ...ip(2) } });
    assert.equal(noToken.status === "error" && noToken.code, "form_expired");
    const staff = await enter(campaignId, "someone@yufora.com", at);
    assert.equal(staff.status === "error" && staff.code, "excluded");
    const owner = await enter(campaignId, "guards-owner@example.com", at);
    assert.equal(owner.status === "error" && owner.code, "excluded");
    const early = await enter(campaignId, "early@example.com", new Date("2026-11-02T20:00:00Z"));
    assert.equal(early.status === "error" && early.code, "not_open_yet");
    const late = await enter(campaignId, "late@example.com", new Date("2026-11-13T05:00:01Z"));
    assert.equal(late.status === "error" && late.code, "closed");
    const bot = await submitEntry({ formToken: null, honeypotFilled: true, raw: { email: "b@x.com" }, ctx: { now: at, ...ip(2) } });
    assert.equal(bot.status, "success");
  });
});

describe("drawing", () => {
  async function populated(slug: string, people: number, opts: { lateConfirm?: boolean } = {}) {
    const g = await liveGiveaway(slug);
    const at = new Date("2026-11-04T16:00:00Z");
    for (let i = 0; i < people; i++) {
      await enter(g.campaignId, `p${i}@example.com`, at, {}, 10 + i);
      const e = await entrantByEmail(g.campaignId, `p${i}@example.com`);
      await confirmEntrant({ token: tokenFor(g.campaignId, e.id, at), ctx: { now: at, ...ip(10 + i) } });
    }
    await enter(g.campaignId, "never@example.com", at, {}, 99);
    if (opts.lateConfirm) {
      const late = await entrantByEmail(g.campaignId, "never@example.com");
      const tooLate = new Date("2026-11-14T05:00:01Z");
      await confirmEntrant({ token: tokenFor(g.campaignId, late.id, at), ctx: { now: tooLate, ...ip(99) } });
    }
    return g;
  }

  test("lock is refused before drawAt; then draws, verifies and never re-rolls", async () => {
    const g = await populated("draw", 6, { lateConfirm: true });
    const early = await lockPool({ ...g, charityId: g.charity.id, userId: g.owner.id, now: new Date("2026-11-13T12:00:00Z"), drand: mockDrand() });
    assert.equal(early.status === "error" && early.code, "not_ready");

    const at = new Date("2026-11-14T06:00:00Z");
    const lock = await lockPool({ campaignId: g.campaignId, charityId: g.charity.id, userId: g.owner.id, now: at, drand: mockDrand() });
    assert.equal(lock.status, "locked");
    assert.equal((await lockPool({ campaignId: g.campaignId, charityId: g.charity.id, userId: g.owner.id, now: at, drand: mockDrand() })).status, "already_locked");

    // After lock, entering is closed and the pool is frozen.
    const [draw] = await testDb.select().from(schema.giveawayDraws).where(eq(schema.giveawayDraws.campaignId, g.campaignId));
    assert.equal(draw.poolSize, 6, "unconfirmed and late-confirmed entrants are excluded");
    assert.equal(draw.serverSeed, null, "seed is not revealed at lock");

    const done = await completeDraw({ campaignId: g.campaignId, drand: mockDrand(), waitBudgetMs: 1000 });
    assert.deepEqual(done, { status: "drawn", already: false });
    const second = await completeDraw({ campaignId: g.campaignId, drand: mockDrand(), waitBudgetMs: 1000 });
    assert.deepEqual(second, { status: "drawn", already: true });

    const [final] = await testDb.select().from(schema.giveawayDraws).where(eq(schema.giveawayDraws.campaignId, g.campaignId));
    const pool = await testDb
      .select({ entryId: schema.giveawayEntries.id, entrantId: schema.giveawayEntries.entrantId })
      .from(schema.giveawayEntries)
      .where(eq(schema.giveawayEntries.drawId, final.id));
    const report = verifyDraw(
      {
        algorithm: final.algorithm,
        seedCommit: final.seedCommit,
        poolHash: final.poolHash,
        poolSize: final.poolSize,
        entrantCount: final.entrantCount,
        chainHash: final.chainHash,
        latestRoundAtLock: final.latestRoundAtLock,
        targetRound: final.targetRound,
        lockedAt: final.lockedAt.toISOString(),
        beacon: { round: final.targetRound, randomness: final.beaconRandomness!, signature: final.beaconSignature! },
        serverSeed: final.serverSeed!,
        finalSeed: final.finalSeed!,
        results: final.results!,
      },
      canonicalPool(pool),
      { verifyBeaconSignature: () => true },
    );
    assert.equal(report.ok, true, JSON.stringify(report.checks));
    assert.equal(final.results!.length, 4);

    const claims = await testDb.select().from(schema.giveawayClaims).where(eq(schema.giveawayClaims.campaignId, g.campaignId));
    assert.equal(claims.length, 1);
    assert.equal(claims[0].rank, 0);
    assert.equal(claims[0].entrantId, final.results![0].entrantId);
  });

  test("a draw interrupted after lock resumes to the same result", async () => {
    const g = await populated("resume", 4);
    const at = new Date("2026-11-14T06:00:00Z");
    await lockPool({ campaignId: g.campaignId, charityId: g.charity.id, userId: null, now: at, drand: mockDrand() });
    const waiting = await completeDraw({ campaignId: g.campaignId, drand: mockDrand({ available: () => false }), waitBudgetMs: 0 });
    assert.equal(waiting.status, "waiting");
    const [locked] = await testDb.select().from(schema.giveawayDraws).where(eq(schema.giveawayDraws.campaignId, g.campaignId));
    assert.equal(locked.completedAt, null);
    await completeDraw({ campaignId: g.campaignId, drand: mockDrand(), waitBudgetMs: 1000 });
    const [done] = await testDb.select().from(schema.giveawayDraws).where(eq(schema.giveawayDraws.campaignId, g.campaignId));
    const pool = await testDb
      .select({ entryId: schema.giveawayEntries.id, entrantId: schema.giveawayEntries.entrantId })
      .from(schema.giveawayEntries)
      .where(eq(schema.giveawayEntries.drawId, done.id));
    assert.deepEqual(done.results, rankPool(done.finalSeed!, pool));
    assert.equal(done.beaconRandomness, fakeBeacon(locked.targetRound).randomness);
  });

  test("an empty pool completes with no entries", async () => {
    const g = await liveGiveaway("empty");
    const r = await lockPool({ campaignId: g.campaignId, charityId: g.charity.id, userId: null, now: new Date("2026-11-14T06:00:00Z"), drand: mockDrand() });
    assert.equal(r.status, "no_entries");
  });
});

describe("claims", () => {
  async function drawn(slug: string, people: number) {
    const g = await liveGiveaway(slug);
    const at = new Date("2026-11-04T16:00:00Z");
    for (let i = 0; i < people; i++) {
      await enter(g.campaignId, `${slug}${i}@example.com`, at, {}, 50 + i);
      const e = await entrantByEmail(g.campaignId, `${slug}${i}@example.com`);
      await confirmEntrant({ token: tokenFor(g.campaignId, e.id, at), ctx: { now: at, ...ip(50 + i) } });
    }
    const drawAt = new Date("2026-11-14T06:00:00Z");
    await lockPool({ campaignId: g.campaignId, charityId: g.charity.id, userId: null, now: drawAt, drand: mockDrand() });
    await completeDraw({ campaignId: g.campaignId, drand: mockDrand(), waitBudgetMs: 1000 });
    return g;
  }

  async function activeClaim(campaignId: string) {
    const rows = await testDb.select().from(schema.giveawayClaims).where(eq(schema.giveawayClaims.campaignId, campaignId));
    const claim = rows.sort((a, b) => b.rank - a.rank)[0];
    const [entrant] = await testDb.select().from(schema.giveawayEntrants).where(eq(schema.giveawayEntrants.id, claim.entrantId));
    const token = issueClaimToken({ campaignId, entrantId: claim.entrantId, claimId: claim.id, deadlineAt: claim.deadlineAt });
    return { claim, entrant, token };
  }

  test("accepting needs the right email; the window can't be cut short", async () => {
    const g = await drawn("accept", 3);
    const { entrant, token, claim } = await activeClaim(g.campaignId);
    const now = new Date();
    const ctx = { now, ...ip(7) };
    const wrong = await respondToClaim({ token, decision: "accept", typedEmail: "else@example.com", legalName: "Ana Reyes", phone: "", attested: true, ctx });
    assert.equal(wrong.status === "error" && wrong.code, "email_mismatch");
    const early = await promoteNextAlternate({ charityId: g.charity.id, campaignId: g.campaignId, reason: "expired", now });
    assert.equal(early.status === "error" && early.code, "too_early");
    const ok = await respondToClaim({ token, decision: "accept", typedEmail: entrant.email.toUpperCase(), legalName: "Ana Reyes", phone: "", attested: true, ctx });
    assert.equal(ok.status, "accepted");
    const twice = await respondToClaim({ token, decision: "decline", typedEmail: entrant.email, legalName: "", phone: "", attested: false, ctx });
    assert.equal(twice.status === "error" && twice.code, "closed");
    assert.equal(await markPrizeAwarded({ charityId: g.charity.id, campaignId: g.campaignId, now }), true);
    const [c] = await testDb.select().from(schema.giveawayCampaigns).where(eq(schema.giveawayCampaigns.id, g.campaignId));
    assert.equal(c.status, "completed");
    assert.equal(c.outcome, "awarded");
    assert.ok(claim.deadlineAt.getTime() > now.getTime());
  });

  test("declines and expiries walk the alternates, then exhaust", async () => {
    const g = await drawn("walk", 2); // winner + 1 alternate only
    const first = await activeClaim(g.campaignId);
    const ctx = { now: new Date(), ...ip(8) };
    assert.equal((await respondToClaim({ token: first.token, decision: "decline", typedEmail: first.entrant.email, legalName: "", phone: "", attested: false, ctx })).status, "declined");
    const p1 = await promoteNextAlternate({ charityId: g.charity.id, campaignId: g.campaignId, reason: "declined", now: new Date() });
    assert.deepEqual(p1, { status: "promoted", rank: 1 });
    const second = await activeClaim(g.campaignId);
    const afterDeadline = new Date(second.claim.deadlineAt.getTime() + 1000);
    const p2 = await promoteNextAlternate({ charityId: g.charity.id, campaignId: g.campaignId, reason: "expired", now: afterDeadline });
    assert.deepEqual(p2, { status: "exhausted" });
    const [c] = await testDb.select().from(schema.giveawayCampaigns).where(eq(schema.giveawayCampaigns.id, g.campaignId));
    assert.equal(c.outcome, "unclaimed");
  });
});

describe("admin data", () => {
  test("per-entrant counts and the CSV are right, and formulas are neutralized", async () => {
    const g = await liveGiveaway("data");
    const at = new Date("2026-11-04T16:00:00Z");
    await enter(g.campaignId, "x@example.com", at, { firstName: "=1+1", marketing: true }, 30);
    const e = await entrantByEmail(g.campaignId, "x@example.com");
    const tok = tokenFor(g.campaignId, e.id, at);
    await confirmEntrant({ token: tok, ctx: { now: at, ...ip(30) } });
    await claimDailyEntry({ token: tok, ctx: { now: new Date("2026-11-05T16:00:00Z"), ...ip(30) } });
    const [row] = await getLatestEntrants(g.campaignId);
    assert.equal(Number(row.entries), 2);
    const exp = await getEntrantsExport(g.campaignId, g.charity.id, true);
    assert.ok(exp);
    const csv = entrantsToCsv(exp!.rows);
    assert.match(csv, /^First name,/);
    assert.match(csv, /\r\n'=1\+1,Reyes,x@example\.com,TX,/);
    assert.match(csv, /,2,0,2,0\.00,Yes,Yes,active\r\n$/);
    const { charity: other } = await seedCharity("data-other");
    assert.equal(await getEntrantsExport(g.campaignId, other.id, false), null);
  });

  test("public reads never include the server seed", async () => {
    const g = await liveGiveaway("secret");
    assert.ok(!PUBLIC_GIVEAWAY_KEYS.includes("serverSeed"));
    const pub = await getPublicGiveaway("secret", g.campaignId);
    assert.ok(pub);
    const [c] = await testDb.select().from(schema.giveawayCampaigns).where(eq(schema.giveawayCampaigns.id, g.campaignId));
    assert.ok(!JSON.stringify(pub).includes(c.serverSeed!));
  });
});

describe("throttle", () => {
  test("parallel hits never lose an increment", async () => {
    const results = await Promise.all(Array.from({ length: 50 }, () => hit("test:parallel", { limit: 40, windowSec: 60 })));
    const counts = results.map((r) => r.count).sort((a, b) => a - b);
    assert.deepEqual(counts, Array.from({ length: 50 }, (_, i) => i + 1));
    assert.equal(results.filter((r) => r.allowed).length, 40);
  });

  test("an expired window restarts at 1", async () => {
    await hit("test:roll", { limit: 5, windowSec: 60 });
    await testDb.update(schema.throttleBuckets).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(schema.throttleBuckets.key, "test:roll"));
    const r = await hit("test:roll", { limit: 5, windowSec: 60 });
    assert.equal(r.count, 1);
  });
});
