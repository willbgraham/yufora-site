import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  countEntryDays,
  entryDayIndex,
  localIsoDate,
  zonedMidnight,
} from "../../lib/giveaways/calendar";
import { US_TIMEZONES } from "../../lib/giveaways/constants";
import { donationGrant, freeGrant, giveawayPhase } from "../../lib/giveaways/entries";
import { getParitySummary } from "../../lib/giveaways/parity";
import {
  isExcludedEmail,
  normalizeEmail,
  parseGiveawayDraft,
  entryFormSchema,
  validateForGoLive,
} from "../../lib/giveaways/validation";
import {
  renderRules,
  rulesPlaceholders,
  rulesToText,
  rulesHashOf,
} from "../../lib/giveaways/rules-template";

const NY = "America/New_York";

describe("calendar", () => {
  test("zonedMidnight round-trips in every supported zone", () => {
    for (const { value: tz } of US_TIMEZONES) {
      for (const iso of ["2026-01-15", "2026-03-08", "2026-03-09", "2026-11-01", "2026-11-02"]) {
        const m = zonedMidnight(iso, tz);
        assert.equal(localIsoDate(m, tz), iso, `${tz} ${iso}`);
        assert.equal(localIsoDate(new Date(m.getTime() - 1), tz) < iso, true, `${tz} ${iso} prev`);
      }
    }
  });

  test("DST spring-forward and fall-back days count as one day each", () => {
    // 2026-03-08: spring forward (23h day). 2026-11-01: fall back (25h day).
    const start = zonedMidnight("2026-03-07", NY);
    const end = zonedMidnight("2026-03-10", NY); // exclusive → 7, 8, 9
    assert.equal(countEntryDays(start, end, NY), 3);
    const s2 = zonedMidnight("2026-10-31", NY);
    const e2 = zonedMidnight("2026-11-03", NY);
    assert.equal(countEntryDays(s2, e2, NY), 3);
    assert.equal(end.getTime() - start.getTime(), (3 * 24 - 1) * 3600_000);
    assert.equal(e2.getTime() - s2.getTime(), (3 * 24 + 1) * 3600_000);
  });

  test("a partial first day still counts, and day index follows local dates", () => {
    const end = zonedMidnight("2026-11-13", NY);
    const lateOnThe3rd = new Date("2026-11-04T03:30:00Z"); // 10:30pm ET on Nov 3
    assert.equal(countEntryDays(lateOnThe3rd, end, NY), 10);
    const c = { startsAt: lateOnThe3rd, timezone: NY };
    assert.equal(entryDayIndex(c, new Date("2026-11-04T04:59:00Z")), 0); // 11:59pm Nov 3
    assert.equal(entryDayIndex(c, new Date("2026-11-04T05:00:00Z")), 1); // midnight Nov 4
  });
});

describe("parity", () => {
  test("boundary: equal passes, one under fails", () => {
    assert.equal(getParitySummary({ perPersonCap: 30, freeEntriesPerDay: 1, entryDays: 30 }).ok, true);
    const fail = getParitySummary({ perPersonCap: 30, freeEntriesPerDay: 1, entryDays: 29 });
    assert.equal(fail.ok, false);
    assert.equal(fail.maxFree, 29);
    assert.equal(fail.suggestedFreePerDay, 2);
  });

  test("go-live snapping can flip a pass to a fail", () => {
    const startsAt = zonedMidnight("2026-11-03", NY);
    const endsAt = zonedMidnight("2026-11-13", NY); // 10 days
    const base = {
      prizeName: "Guitar",
      prizeDescription: "A handmade acoustic guitar with a hard case.",
      prizeArvCents: 120_000,
      timezone: NY,
      startsAt,
      endsAt,
      freeEntriesPerDay: 1,
      perPersonCap: 10,
      donationsEnabled: false,
      centsPerEntry: null,
      sponsorLegalName: "Melba Foundation, Inc.",
      sponsorStreet: "1 Main St",
      sponsorCity: "Austin",
      sponsorState: "TX",
      sponsorZip: "78701",
    };
    const ctx = {
      goLiveOpen: true,
      entitled: true,
      stripe: { configured: false, accountId: null, chargesEnabled: false },
    };
    assert.equal(validateForGoLive(base, { ...ctx, now: new Date("2026-11-02T12:00:00Z") }).ok, true);
    const late = validateForGoLive(base, { ...ctx, now: new Date("2026-11-04T12:00:00Z") });
    assert.equal(late.ok, false);
    assert.equal(late.checks.find((c) => c.key === "parity")?.ok, false);
  });
});

describe("entry grants", () => {
  test("free grant respects today's allowance and the cap", () => {
    assert.equal(freeGrant({ freeEntriesPerDay: 2, perPersonCap: 10, currentActive: 0, claimedToday: 0 }), 2);
    assert.equal(freeGrant({ freeEntriesPerDay: 2, perPersonCap: 10, currentActive: 9, claimedToday: 0 }), 1);
    assert.equal(freeGrant({ freeEntriesPerDay: 2, perPersonCap: 10, currentActive: 10, claimedToday: 0 }), 0);
    assert.equal(freeGrant({ freeEntriesPerDay: 2, perPersonCap: 10, currentActive: 4, claimedToday: 2 }), 0);
  });

  test("donation grant floors and caps", () => {
    assert.equal(donationGrant({ amountCents: 2500, centsPerEntry: 1000, perPersonCap: 30, currentActive: 0 }), 2);
    assert.equal(donationGrant({ amountCents: 10000, centsPerEntry: 1000, perPersonCap: 30, currentActive: 25 }), 5);
    assert.equal(donationGrant({ amountCents: 10000, centsPerEntry: 1000, perPersonCap: 30, currentActive: 30 }), 0);
    assert.equal(donationGrant({ amountCents: 500, centsPerEntry: 500, perPersonCap: 30, currentActive: 0 }), 1);
  });

  test("phase follows the clock", () => {
    const c = {
      status: "live",
      startsAt: new Date("2026-11-03T05:00:00Z"),
      endsAt: new Date("2026-11-13T05:00:00Z"),
      drawAt: new Date("2026-11-14T05:00:00Z"),
    };
    assert.equal(giveawayPhase(c, new Date("2026-11-02T00:00:00Z")), "scheduled");
    assert.equal(giveawayPhase(c, new Date("2026-11-05T00:00:00Z")), "open");
    assert.equal(giveawayPhase(c, new Date("2026-11-13T06:00:00Z")), "closed");
    assert.equal(giveawayPhase(c, new Date("2026-11-14T05:00:00Z")), "ready_to_draw");
    assert.equal(giveawayPhase({ ...c, status: "drawn" }, new Date()), "drawn");
  });
});

describe("validation", () => {
  const now = new Date("2026-11-01T12:00:00Z");
  const good = {
    prizeName: "A handmade acoustic guitar",
    prizeDescription: "",
    prizeArv: "1200",
    startDate: "2026-11-03",
    endDate: "2026-11-30",
    timezone: NY,
    freeEntriesPerDay: "1",
    perPersonCap: "28",
    donationsEnabled: true,
    dollarsPerEntry: "10",
    claimDeadlineDays: "7",
  };

  test("a valid draft parses with an exclusive end and a 24h draw gap", () => {
    const r = parseGiveawayDraft(good, now);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.values.prizeArvCents, 120_000);
    assert.equal(r.values.centsPerEntry, 1000);
    assert.equal(localIsoDate(r.values.endsAt, NY), "2026-12-01");
    assert.equal(r.values.drawAt.getTime() - r.values.endsAt.getTime(), 24 * 3600_000);
  });

  test("ARV must stay under $5,000", () => {
    const ok = parseGiveawayDraft({ ...good, prizeArv: "4999.99" }, now);
    assert.equal(ok.ok, true);
    const bad = parseGiveawayDraft({ ...good, prizeArv: "5000" }, now);
    assert.equal(bad.ok, false);
    if (!bad.ok) assert.match(bad.fieldErrors.prizeArv, /less than \$5,000/);
  });

  test("dates: order, past end, and the 90-day limit", () => {
    const order = parseGiveawayDraft({ ...good, endDate: "2026-11-02" }, now);
    assert.equal(order.ok, false);
    const past = parseGiveawayDraft({ ...good, startDate: "2026-10-01", endDate: "2026-10-20" }, now);
    assert.equal(past.ok, false);
    if (!past.ok) assert.equal(past.fieldErrors.endDate, "The end date has passed");
    const long = parseGiveawayDraft({ ...good, endDate: "2027-02-01" }, now);
    assert.equal(long.ok, false);
    if (!long.ok) assert.match(long.fieldErrors.endDate, /90 days/);
  });

  test("bonus entries need a whole-dollar rate of $5 or more", () => {
    for (const v of ["4", "7.50", "", "abc"]) {
      const r = parseGiveawayDraft({ ...good, dollarsPerEntry: v }, now);
      assert.equal(r.ok, false, v);
    }
  });

  test("Rhode Island gets its own message; DC is fine; territories are not", () => {
    const base = {
      firstName: "Ana",
      lastName: "Reyes",
      email: "ana@example.com",
      ageConfirm: "on",
      rulesAgree: "on",
      publicDisplay: false,
      marketing: false,
    };
    const ri = entryFormSchema.safeParse({ ...base, state: "RI" });
    assert.equal(ri.success, false);
    if (!ri.success) assert.match(ri.error.issues[0].message, /Rhode Island/);
    assert.equal(entryFormSchema.safeParse({ ...base, state: "DC" }).success, true);
    assert.equal(entryFormSchema.safeParse({ ...base, state: "PR" }).success, false);
    assert.equal(entryFormSchema.safeParse({ ...base, state: "TX", ageConfirm: undefined }).success, false);
  });

  test("email normalization folds tags, case and gmail dots", () => {
    assert.equal(normalizeEmail(" Ana.Reyes+gw@GoogleMail.com "), "anareyes@gmail.com");
    assert.equal(normalizeEmail("a.b+x@example.org"), "a.b@example.org");
  });

  test("exclusions: yufora.com, staff, owner and listed domains", () => {
    const ctx = { domains: "melba.org", ownerEmail: "Owner@Example.com", staffEmails: ["will@yufora.com"] };
    assert.equal(isExcludedEmail("x@yufora.com", ctx), true);
    assert.equal(isExcludedEmail("x@team.melba.org", ctx), true);
    assert.equal(isExcludedEmail("owner@example.com", ctx), true);
    assert.equal(isExcludedEmail("fan@example.com", ctx), false);
  });
});

describe("rules template", () => {
  const input = {
    campaignId: "00000000-0000-4000-8000-000000000001",
    charityName: "MELBA Foundation",
    charitySlug: "melba",
    origin: "https://yufora.com",
    prizeName: "A handmade acoustic guitar",
    prizeDescription: "A solid-top acoustic guitar with a hard case.",
    prizeArvCents: 120_000,
    timezone: NY,
    startsAt: zonedMidnight("2026-11-03", NY),
    endsAt: zonedMidnight("2026-12-01", NY),
    drawAt: new Date(zonedMidnight("2026-12-01", NY).getTime() + 86_400_000),
    freeEntriesPerDay: 1,
    perPersonCap: 28,
    donationsEnabled: true,
    centsPerEntry: 1000,
    claimDeadlineDays: 7,
    sponsorLegalName: "MELBA Foundation, Inc.",
    sponsorStreet: "1 Main St",
    sponsorCity: "Austin",
    sponsorState: "TX",
    sponsorZip: "78701",
    sponsorPrivacyUrl: null,
    seedCommit: "ab".repeat(32),
  };

  test("renders deterministically with the numbers the code enforces", () => {
    const a = rulesToText(renderRules(input));
    const b = rulesToText(renderRules(input));
    assert.equal(a, b);
    assert.equal(rulesHashOf(a), rulesHashOf(b));
    assert.match(a, /at most 28 total entries/);
    assert.match(a, /one \(1\) bonus entry for every \$10/);
    assert.match(a, /11:59:59 p\.m\. ET on November 30, 2026/);
    assert.match(a, /governed by the laws of Texas/);
    assert.match(a, new RegExp(input.seedCommit));
  });

  test("an incomplete sponsor leaves visible placeholders", () => {
    const text = rulesToText(renderRules({ ...input, sponsorStreet: "", sponsorZip: "" }));
    const holes = rulesPlaceholders(text);
    assert.ok(holes.includes("street address"));
    assert.ok(holes.includes("ZIP"));
  });
});
