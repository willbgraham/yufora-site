import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { MIN_FILL_MS } from "../schema";

/**
 * Signed, stateless giveaway links: v1.<b64url(JSON payload)>.<b64url(MAC)>.
 *
 * Each purpose gets its own derived key, so a token minted for one purpose
 * can never verify as another. Tokens hold no revocation state — every use
 * re-checks entrant/claim status in the database. Rotation: GIVEAWAYS_SECRET
 * is a comma list; the first secret signs, all of them verify.
 */

export type TokenPurpose = "form" | "entrant" | "claim";

type BasePayload = { iat: number; exp: number };
export type FormPayload = BasePayload & { p: "form"; c: string; n: string };
export type EntrantPayload = BasePayload & { p: "entrant"; c: string; e: string };
export type ClaimPayload = BasePayload & { p: "claim"; c: string; e: string; k: string };
export type TokenPayload = FormPayload | EntrantPayload | ClaimPayload;

type PayloadFor<P extends TokenPurpose> = Extract<TokenPayload, { p: P }>;

export type VerifyFailure = "malformed" | "bad_sig" | "wrong_purpose" | "expired";

const DEV_SECRET = "insecure-dev-giveaways-secret-do-not-use-in-prod";
let warned = false;

export function giveawaysSecrets(): string[] {
  const list = (process.env.GIVEAWAYS_SECRET ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length > 0) return list;
  if (process.env.BETTER_AUTH_SECRET) return [process.env.BETTER_AUTH_SECRET];
  if (process.env.NODE_ENV === "production" && !warned) {
    warned = true;
    console.error(
      "[giveaways] Neither GIVEAWAYS_SECRET nor BETTER_AUTH_SECRET is set in production — giveaway links are signed with an insecure fallback.",
    );
  }
  return [DEV_SECRET];
}

function purposeKey(secret: string, purpose: string): Buffer {
  return createHmac("sha256", secret)
    .update(`yufora/giveaways/v1/${purpose}`)
    .digest();
}

function mac(secret: string, purpose: string, body: string): Buffer {
  return createHmac("sha256", purposeKey(secret, purpose)).update(body).digest();
}

const b64 = (buf: Buffer | string) => Buffer.from(buf).toString("base64url");

export function signToken(payload: TokenPayload): string {
  const body = `v1.${b64(JSON.stringify(payload))}`;
  return `${body}.${b64(mac(giveawaysSecrets()[0], payload.p, body))}`;
}

export function verifyToken<P extends TokenPurpose>(
  token: string | null | undefined,
  purpose: P,
  nowMs: number = Date.now(),
): { ok: true; payload: PayloadFor<P> } | { ok: false; reason: VerifyFailure } {
  if (!token || typeof token !== "string" || token.length > 2048) {
    return { ok: false, reason: "malformed" };
  }
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return { ok: false, reason: "malformed" };
  const body = `${parts[0]}.${parts[1]}`;
  let given: Buffer;
  let payload: TokenPayload;
  try {
    given = Buffer.from(parts[2], "base64url");
    payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (!payload || typeof payload !== "object" || typeof payload.p !== "string") {
    return { ok: false, reason: "malformed" };
  }
  // Verify the MAC under the CLAIMED purpose's key first, so a tampered
  // purpose fails as bad_sig; then require the purpose we expect.
  const valid = giveawaysSecrets().some((secret) => {
    const expected = mac(secret, payload.p, body);
    return expected.length === given.length && timingSafeEqual(expected, given);
  });
  if (!valid) return { ok: false, reason: "bad_sig" };
  if (payload.p !== purpose) return { ok: false, reason: "wrong_purpose" };
  if (typeof payload.exp !== "number" || nowMs >= payload.exp) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true, payload: payload as PayloadFor<P> };
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Issued when the entry form renders; replaces the client-set startedAt
 *  timestamp, which a bot could simply omit. */
export function issueFormToken(campaignId: string, nowMs: number = Date.now()): string {
  return signToken({
    p: "form",
    c: campaignId,
    n: randomBytes(12).toString("base64url"),
    iat: nowMs,
    exp: nowMs + 2 * HOUR,
  });
}

export function checkFormToken(
  token: string | null | undefined,
  nowMs: number = Date.now(),
):
  | { ok: true; campaignId: string; nonce: string }
  | { ok: false; reason: VerifyFailure | "too_fast" } {
  const v = verifyToken(token, "form", nowMs);
  if (!v.ok) return v;
  if (nowMs - v.payload.iat < MIN_FILL_MS) return { ok: false, reason: "too_fast" };
  return { ok: true, campaignId: v.payload.c, nonce: v.payload.n };
}

/**
 * The entrant's one personal link (in the confirmation email): it shows
 * Confirm until they confirm, then their entries, the daily free entry and
 * bonus entries. Reusable; daily claims are deduped by the database.
 */
export function issueEntrantToken(
  args: { campaignId: string; entrantId: string; endsAt: Date },
  nowMs: number = Date.now(),
): string {
  return signToken({
    p: "entrant",
    c: args.campaignId,
    e: args.entrantId,
    iat: nowMs,
    // Readable well after the end so "You had N entries" still loads.
    exp: args.endsAt.getTime() + 30 * DAY,
  });
}

export function issueClaimToken(
  args: { campaignId: string; entrantId: string; claimId: string; deadlineAt: Date },
  nowMs: number = Date.now(),
): string {
  return signToken({
    p: "claim",
    c: args.campaignId,
    e: args.entrantId,
    k: args.claimId,
    iat: nowMs,
    // The page explains an expired window, so keep the link readable.
    exp: args.deadlineAt.getTime() + 30 * DAY,
  });
}

/** One-way fingerprints for throttle keys and fraud review — never raw values. */
export function hashIdentifier(kind: "ip" | "email", value: string): string {
  return createHmac("sha256", purposeKey(giveawaysSecrets()[0], `hash/${kind}`))
    .update(value)
    .digest("base64url")
    .slice(0, 22);
}
