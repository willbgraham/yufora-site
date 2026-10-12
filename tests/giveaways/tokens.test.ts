import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  checkFormToken,
  issueClaimToken,
  issueEntrantToken,
  issueFormToken,
  signToken,
  verifyToken,
} from "../../lib/giveaways/tokens";

const C = "00000000-0000-4000-8000-000000000001";
const E = "00000000-0000-4000-8000-000000000002";
const T0 = Date.parse("2026-11-05T12:00:00Z");
const endsAt = new Date("2026-12-01T05:00:00Z");

afterEach(() => {
  delete process.env.GIVEAWAYS_SECRET;
});

describe("tokens", () => {
  test("round trip", () => {
    const t = issueEntrantToken({ campaignId: C, entrantId: E, endsAt }, T0);
    const v = verifyToken(t, "entrant", T0 + 1000);
    assert.equal(v.ok, true);
    if (v.ok) assert.equal(v.payload.e, E);
  });

  test("any flipped character fails", () => {
    const t = issueEntrantToken({ campaignId: C, entrantId: E, endsAt }, T0);
    for (const i of [5, Math.floor(t.length / 2), t.length - 2]) {
      const ch = t[i] === "A" ? "B" : "A";
      const bad = t.slice(0, i) + ch + t.slice(i + 1);
      const v = verifyToken(bad, "entrant", T0);
      assert.equal(v.ok, false, `index ${i}`);
    }
  });

  test("a token for one purpose never verifies as another", () => {
    const entrant = issueEntrantToken({ campaignId: C, entrantId: E, endsAt }, T0);
    const v = verifyToken(entrant, "claim", T0);
    assert.deepEqual(v, { ok: false, reason: "wrong_purpose" });
    // Re-labelling the payload's purpose breaks the MAC (per-purpose keys).
    const [, body, mac] = entrant.split(".");
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    payload.p = "claim";
    payload.k = "x";
    const forged = `v1.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${mac}`;
    assert.deepEqual(verifyToken(forged, "claim", T0), { ok: false, reason: "bad_sig" });
  });

  test("expiry", () => {
    const t = issueClaimToken(
      { campaignId: C, entrantId: E, claimId: "k", deadlineAt: new Date(T0 + 1000) },
      T0,
    );
    assert.equal(verifyToken(t, "claim", T0 + 1000).ok, true);
    assert.deepEqual(verifyToken(t, "claim", T0 + 31 * 86_400_000), { ok: false, reason: "expired" });
  });

  test("rotation: old secret still verifies, new secret signs", () => {
    process.env.GIVEAWAYS_SECRET = "old-secret";
    const old = issueEntrantToken({ campaignId: C, entrantId: E, endsAt }, T0);
    process.env.GIVEAWAYS_SECRET = "new-secret,old-secret";
    assert.equal(verifyToken(old, "entrant", T0).ok, true);
    const fresh = issueEntrantToken({ campaignId: C, entrantId: E, endsAt }, T0);
    process.env.GIVEAWAYS_SECRET = "new-secret";
    assert.equal(verifyToken(fresh, "entrant", T0).ok, true);
    assert.equal(verifyToken(old, "entrant", T0).ok, false);
  });

  test("form token: missing, too fast, expired", () => {
    assert.equal(checkFormToken(null, T0).ok, false);
    assert.equal(checkFormToken("", T0).ok, false);
    const t = issueFormToken(C, T0);
    assert.deepEqual(checkFormToken(t, T0 + 500), { ok: false, reason: "too_fast" });
    const ok = checkFormToken(t, T0 + 5000);
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.campaignId, C);
    assert.deepEqual(checkFormToken(t, T0 + 3 * 3600_000), { ok: false, reason: "expired" });
  });

  test("malformed input is rejected cleanly", () => {
    for (const bad of ["x", "v1.x", "v2.a.b", "v1.!!!.???", "v1." + "a".repeat(3000) + ".b"]) {
      assert.equal(verifyToken(bad, "entrant", T0).ok, false, bad.slice(0, 10));
    }
    assert.equal(
      verifyToken(signToken({ p: "form", c: C, n: "n", iat: T0, exp: T0 + 10 }), "form", T0).ok,
      true,
    );
  });
});
