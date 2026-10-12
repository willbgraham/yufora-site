import { sha256 } from "@noble/hashes/sha2.js";
import { hmac } from "@noble/hashes/hmac.js";
import {
  bytesToHex,
  concatBytes,
  hexToBytes,
  utf8ToBytes,
} from "@noble/hashes/utils.js";
import { ALTERNATES, DRAW_ALGORITHM } from "./constants";
import { QUICKNET, checkBeaconHash, roundTimeMs } from "./drand";
import type {
  DrawResult,
  PoolEntry,
  PublishedDraw,
  VerifyCheck,
  VerifyReport,
} from "./types";

/**
 * The draw algorithm "yufora-draw-v1". Isomorphic and dependency-light: the
 * server draw and the public verifier run THIS code, so what we publish is
 * exactly what anyone can recompute. All hex is lowercase, no 0x.
 *
 *   seedCommit = sha256(serverSeed bytes)                     (go-live)
 *   poolText   = sorted "<entryId>,<entrantId>\n" lines       (lock)
 *   poolHash   = sha256(utf8(poolText))
 *   finalSeed  = HMAC-SHA256(serverSeed, randomness ‖ poolHash)
 *   ticket_i   = HMAC-SHA256(finalSeed, utf8(entryId_i))
 *   order by (ticket asc, entryId asc); first 1 + ALTERNATES DISTINCT
 *   entrants are the winner and alternates, in order.
 *
 * Hex strings of equal length compare in the same order as the big-endian
 * numbers they encode, so no BigInt is needed (tsconfig targets ES2017).
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HEX32_RE = /^[0-9a-f]{64}$/;

function assertUuid(value: string): string {
  if (!UUID_RE.test(value)) throw new Error(`not a lowercase UUID: ${value}`);
  return value;
}

function assertHex32(value: string, what: string): string {
  if (!HEX32_RE.test(value)) throw new Error(`${what} must be 32 bytes of lowercase hex`);
  return value;
}

export function seedCommit(serverSeed: string): string {
  return bytesToHex(sha256(hexToBytes(assertHex32(serverSeed, "seed"))));
}

export function canonicalPool(pool: PoolEntry[]): string {
  const lines = pool
    .map(
      ({ entryId, entrantId }) =>
        `${assertUuid(entryId)},${assertUuid(entrantId)}\n`,
    )
    .sort();
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].slice(0, 36) === lines[i - 1].slice(0, 36)) {
      throw new Error(`duplicate entry ${lines[i].slice(0, 36)}`);
    }
  }
  return lines.join("");
}

export function parsePool(poolText: string): PoolEntry[] {
  if (poolText === "") return [];
  if (!poolText.endsWith("\n")) throw new Error("pool must end with a newline");
  return poolText
    .slice(0, -1)
    .split("\n")
    .map((line) => {
      const [entryId, entrantId, extra] = line.split(",");
      if (extra !== undefined || !entrantId) {
        throw new Error(`bad pool line: ${line}`);
      }
      return { entryId: assertUuid(entryId), entrantId: assertUuid(entrantId) };
    });
}

export function poolHash(poolText: string): string {
  return bytesToHex(sha256(utf8ToBytes(poolText)));
}

export function finalSeed(
  serverSeed: string,
  randomness: string,
  poolHashHex: string,
): string {
  return bytesToHex(
    hmac(
      sha256,
      hexToBytes(assertHex32(serverSeed, "seed")),
      concatBytes(
        hexToBytes(assertHex32(randomness, "randomness")),
        hexToBytes(assertHex32(poolHashHex, "pool hash")),
      ),
    ),
  );
}

export function ticket(finalSeedHex: string, entryId: string): string {
  return bytesToHex(
    hmac(
      sha256,
      hexToBytes(assertHex32(finalSeedHex, "final seed")),
      utf8ToBytes(entryId),
    ),
  );
}

export function rankPool(
  finalSeedHex: string,
  pool: PoolEntry[],
  picks: number = 1 + ALTERNATES,
): DrawResult[] {
  const key = hexToBytes(assertHex32(finalSeedHex, "final seed"));
  const scored = pool.map((e) => ({
    ...e,
    ticket: bytesToHex(hmac(sha256, key, utf8ToBytes(e.entryId))),
  }));
  scored.sort((a, b) =>
    a.ticket < b.ticket
      ? -1
      : a.ticket > b.ticket
        ? 1
        : a.entryId < b.entryId
          ? -1
          : a.entryId > b.entryId
            ? 1
            : 0,
  );
  const chosen = new Set<string>();
  const results: DrawResult[] = [];
  for (const s of scored) {
    if (results.length >= picks) break;
    if (chosen.has(s.entrantId)) continue;
    chosen.add(s.entrantId);
    results.push({
      rank: results.length,
      entryId: s.entryId,
      entrantId: s.entrantId,
      ticket: s.ticket,
    });
  }
  return results;
}

function sameResults(a: DrawResult[], b: DrawResult[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (r, i) =>
        r.rank === b[i].rank &&
        r.entryId === b[i].entryId &&
        r.entrantId === b[i].entrantId &&
        r.ticket === b[i].ticket,
    )
  );
}

/**
 * Recomputes every step of a published draw from the published inputs.
 * Each check fails independently, so the report says exactly what is wrong.
 * BLS signature verification is injectable (it needs @noble/curves, which
 * the browser loads on demand).
 */
export function verifyDraw(
  pub: PublishedDraw,
  poolText: string,
  opts: {
    verifyBeaconSignature?: (round: number, signature: string) => boolean;
  } = {},
): VerifyReport {
  const checks: VerifyCheck[] = [];
  const run = (name: string, fn: () => boolean | "skipped", detail?: string) => {
    try {
      checks.push({ name, pass: fn(), detail });
    } catch (err) {
      checks.push({
        name,
        pass: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  };

  let pool: PoolEntry[] = [];
  run("algorithm", () => pub.algorithm === DRAW_ALGORITHM);
  run("commit", () => seedCommit(pub.serverSeed) === pub.seedCommit);
  run("poolCanonical", () => {
    pool = parsePool(poolText);
    return canonicalPool(pool) === poolText && pool.length === pub.poolSize;
  });
  run("poolHash", () => poolHash(poolText) === pub.poolHash);
  run(
    "entrantCount",
    () => new Set(pool.map((e) => e.entrantId)).size === pub.entrantCount,
  );
  run("chain", () => pub.chainHash === QUICKNET.hash);
  run(
    "futureRound",
    () =>
      pub.beacon.round === pub.targetRound &&
      pub.targetRound > pub.latestRoundAtLock &&
      roundTimeMs(pub.targetRound) > Date.parse(pub.lockedAt),
  );
  run("beaconHash", () => checkBeaconHash(pub.beacon));
  run("beaconSignature", () =>
    opts.verifyBeaconSignature
      ? opts.verifyBeaconSignature(pub.beacon.round, pub.beacon.signature)
      : "skipped",
  );
  let recomputedSeed = "";
  run("finalSeed", () => {
    recomputedSeed = finalSeed(pub.serverSeed, pub.beacon.randomness, pub.poolHash);
    return recomputedSeed === pub.finalSeed;
  });
  run("results", () =>
    sameResults(rankPool(recomputedSeed || pub.finalSeed, pool), pub.results),
  );

  return { ok: checks.every((c) => c.pass !== false), checks };
}
