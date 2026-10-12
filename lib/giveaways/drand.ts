import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import type { Beacon } from "./types";

/**
 * drand "quicknet": a public randomness beacon run by the League of
 * Entropy, producing an unpredictable, publicly verifiable value every 3s.
 * Chain info is PINNED here (not fetched), so a compromised relay can't
 * swap the chain or key. Isomorphic; fetch is injectable for tests.
 *
 * BLS signature verification lives in drand-bls.ts so the browser only
 * loads the pairing library when someone actually verifies.
 */
export const QUICKNET = {
  hash: "52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971",
  publicKey:
    "83cf0f2896adee7eb8b5f01fcad3912212c437e0073e911fb90022d3e760183c8c4b450b6a0a6c3ac6a5776a2d1064510d1fec758c921cc22b0e17e63aaf4bcb5ed66304de9cf809bd274ca73bab4af5a6e9c76a4bc09e76eae8991ef5ece45a",
  period: 3,
  genesisTime: 1692803367,
  scheme: "bls-unchained-g1-rfc9380",
  relays: [
    "https://api.drand.sh",
    "https://api2.drand.sh",
    "https://drand.cloudflare.com",
    "https://api3.drand.sh",
  ],
} as const;

export function roundTimeMs(round: number): number {
  return (QUICKNET.genesisTime + (round - 1) * QUICKNET.period) * 1000;
}

/** The round being produced at `ms` (the latest one published by then). */
export function roundAt(ms: number): number {
  const elapsed = ms / 1000 - QUICKNET.genesisTime;
  return elapsed < 0 ? 1 : Math.floor(elapsed / QUICKNET.period) + 1;
}

export function roundUrl(round: number | "latest", relay: string = QUICKNET.relays[0]) {
  return `${relay}/${QUICKNET.hash}/public/${round}`;
}

const HEX_RE = /^[0-9a-f]+$/;

/** sha256(signature) must equal randomness for unchained schemes. */
export function checkBeaconHash(b: Beacon): boolean {
  if (!HEX_RE.test(b.signature) || !HEX_RE.test(b.randomness)) return false;
  return bytesToHex(sha256(hexToBytes(b.signature))) === b.randomness;
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

function parseBeacon(json: unknown): Beacon | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  if (
    typeof o.round !== "number" ||
    typeof o.randomness !== "string" ||
    typeof o.signature !== "string"
  ) {
    return null;
  }
  return { round: o.round, randomness: o.randomness, signature: o.signature };
}

async function tryRelays(
  path: (relay: string) => string,
  f: FetchLike,
): Promise<{ beacon: Beacon | null; notYet: boolean }> {
  let lastError: unknown = null;
  let notYet = false;
  for (const relay of QUICKNET.relays) {
    try {
      const res = await f(path(relay), {
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      if (res.status === 404 || res.status === 425) {
        notYet = true;
        continue;
      }
      if (!res.ok) {
        lastError = new Error(`${relay} returned ${res.status}`);
        continue;
      }
      const beacon = parseBeacon(await res.json());
      if (beacon) return { beacon, notYet: false };
      lastError = new Error(`${relay} returned a malformed beacon`);
    } catch (err) {
      lastError = err;
    }
  }
  if (notYet) return { beacon: null, notYet: true };
  throw lastError ?? new Error("no drand relay responded");
}

export async function fetchLatest(f: FetchLike = fetch): Promise<Beacon> {
  const { beacon } = await tryRelays((r) => roundUrl("latest", r), f);
  if (!beacon) throw new Error("drand has no latest round");
  return beacon;
}

/** null when the round hasn't been produced yet; throws if no relay answers. */
export async function fetchRound(
  round: number,
  f: FetchLike = fetch,
): Promise<Beacon | null> {
  const { beacon } = await tryRelays((r) => roundUrl(round, r), f);
  if (beacon && beacon.round !== round) {
    throw new Error(`relay returned round ${beacon.round}, wanted ${round}`);
  }
  return beacon;
}
