import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import {
  canonicalPool,
  finalSeed,
  parsePool,
  poolHash,
  rankPool,
  seedCommit,
  ticket,
  verifyDraw,
} from "../../lib/giveaways/draw-core";
import {
  QUICKNET,
  checkBeaconHash,
  fetchRound,
  roundAt,
  roundTimeMs,
} from "../../lib/giveaways/drand";
import { verifyBeaconSignature } from "../../lib/giveaways/drand-bls";
import type { PoolEntry, PublishedDraw } from "../../lib/giveaways/types";

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;

// Entrant k holds entries 10k..10k+2 (three tickets each), 6 entrants.
const POOL: PoolEntry[] = [];
for (let k = 1; k <= 6; k++) {
  for (let j = 0; j < 3; j++) {
    POOL.push({ entryId: uuid(k * 10 + j), entrantId: uuid(1000 + k) });
  }
}
const SEED = "11".repeat(32);
const ROUND_1000 = {
  round: 1000,
  randomness: "fe290beca10872ef2fb164d2aa4442de4566183ec51c56ff3cd603d930e54fdd",
  signature:
    "b44679b9a59af2ec876b1a6b1ad52ea9b1615fc3982b19576350f93447cb1125e342b73a8dd2bacbe47e4b6b63ed5e39",
};

describe("draw core", () => {
  test("matches an independent node:crypto implementation", () => {
    const text = canonicalPool(POOL);
    const ph = createHash("sha256").update(text, "utf8").digest("hex");
    assert.equal(poolHash(text), ph);
    assert.equal(
      seedCommit(SEED),
      createHash("sha256").update(Buffer.from(SEED, "hex")).digest("hex"),
    );
    const fs = createHmac("sha256", Buffer.from(SEED, "hex"))
      .update(Buffer.concat([Buffer.from(ROUND_1000.randomness, "hex"), Buffer.from(ph, "hex")]))
      .digest("hex");
    assert.equal(finalSeed(SEED, ROUND_1000.randomness, ph), fs);
    const t = createHmac("sha256", Buffer.from(fs, "hex")).update(POOL[0].entryId).digest("hex");
    assert.equal(ticket(fs, POOL[0].entryId), t);
  });

  test("golden vector is stable", () => {
    const text = canonicalPool(POOL);
    const fs = finalSeed(SEED, ROUND_1000.randomness, poolHash(text));
    const results = rankPool(fs, POOL);
    // Pinned: any change to the algorithm breaks published draws.
    assert.deepEqual(
      { poolHash: poolHash(text), finalSeed: fs, winner: results[0].entryId },
      GOLDEN,
    );
  });

  test("pool order doesn't matter; alternates are distinct people", () => {
    const fs = "22".repeat(32);
    const a = rankPool(fs, POOL);
    const b = rankPool(fs, [...POOL].reverse());
    assert.deepEqual(a, b);
    assert.equal(a.length, 4);
    assert.equal(new Set(a.map((r) => r.entrantId)).size, 4);
    assert.deepEqual(a.map((r) => r.rank), [0, 1, 2, 3]);
  });

  test("canonical pool rejects duplicates and round-trips", () => {
    assert.throws(() => canonicalPool([POOL[0], POOL[0]]), /duplicate/);
    const text = canonicalPool(POOL);
    assert.equal(canonicalPool(parsePool(text)), text);
    assert.throws(() => parsePool(text.slice(0, -1)), /newline/);
  });

  function published(): { pub: PublishedDraw; text: string } {
    const text = canonicalPool(POOL);
    const ph = poolHash(text);
    const fs = finalSeed(SEED, ROUND_1000.randomness, ph);
    return {
      text,
      pub: {
        algorithm: "yufora-draw-v1",
        seedCommit: seedCommit(SEED),
        poolHash: ph,
        poolSize: POOL.length,
        entrantCount: 6,
        chainHash: QUICKNET.hash,
        latestRoundAtLock: 990,
        targetRound: 1000,
        lockedAt: new Date(roundTimeMs(990)).toISOString(),
        beacon: ROUND_1000,
        serverSeed: SEED,
        finalSeed: fs,
        results: rankPool(fs, POOL),
      },
    };
  }

  test("verifyDraw passes an honest draw, including the BLS check", () => {
    const { pub, text } = published();
    const report = verifyDraw(pub, text, { verifyBeaconSignature });
    assert.equal(report.ok, true, JSON.stringify(report.checks.filter((c) => c.pass !== true)));
  });

  test("verifyDraw catches each kind of tampering", () => {
    const { pub, text } = published();
    const flip = (hex: string) => (hex[0] === "a" ? "b" : "a") + hex.slice(1);
    const cases: [string, PublishedDraw, string][] = [
      ["commit", { ...pub, serverSeed: "33".repeat(32) }, text],
      ["poolHash", pub, text.replace(POOL[0].entryId.slice(-4), "ffff")],
      ["poolCanonical", pub, text.split("\n").reverse().join("\n").trimStart() + "\n"],
      ["beaconHash", { ...pub, beacon: { ...pub.beacon, randomness: flip(pub.beacon.randomness) } }, text],
      ["finalSeed", { ...pub, finalSeed: flip(pub.finalSeed) }, text],
      ["results", { ...pub, results: [...pub.results].reverse() }, text],
      ["futureRound", { ...pub, latestRoundAtLock: 1000 }, text],
    ];
    for (const [name, p, t] of cases) {
      const report = verifyDraw(p, t, { verifyBeaconSignature });
      assert.equal(report.ok, false, name);
      const failed = report.checks.filter((c) => c.pass === false).map((c) => c.name);
      assert.ok(failed.includes(name), `${name}: failed ${failed.join(",")}`);
    }
    const sig = verifyDraw(
      { ...pub, beacon: { ...pub.beacon, signature: flip(pub.beacon.signature) } },
      text,
      { verifyBeaconSignature },
    );
    assert.equal(sig.checks.find((c) => c.name === "beaconSignature")?.pass, false);
  });
});

describe("drand", () => {
  test("round 1000 vector: hash and BLS signature verify", () => {
    assert.equal(checkBeaconHash(ROUND_1000), true);
    assert.equal(verifyBeaconSignature(1000, ROUND_1000.signature), true);
    assert.equal(verifyBeaconSignature(1001, ROUND_1000.signature), false);
  });

  test("roundAt and roundTimeMs are inverses", () => {
    for (const r of [1, 2, 1000, 33_000_000]) {
      assert.equal(roundAt(roundTimeMs(r)), r);
      assert.equal(roundAt(roundTimeMs(r) + 2999), r);
    }
  });

  test("fetchRound returns null for a round that doesn't exist yet", async () => {
    const tooEarly = async () => new Response("", { status: 425 });
    assert.equal(await fetchRound(99_999_999, tooEarly), null);
    const down = async () => {
      throw new Error("offline");
    };
    await assert.rejects(fetchRound(5, down));
    const wrong = async () => Response.json({ ...ROUND_1000, round: 999 });
    await assert.rejects(fetchRound(1000, wrong), /wanted 1000/);
  });
});

const GOLDEN = {
  poolHash: "3bb3653e352ed2c5d53f8feb1932371a9c053726292c19c0db7ea7a21a434cb9",
  finalSeed: "9b76604b443dc73bc27a47259fe19f5fa51d51d4cf41e75bf4cabf00728a81b9",
  winner: "00000000-0000-4000-8000-000000000020",
};
