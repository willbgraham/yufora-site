"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { PublishedDraw, VerifyReport } from "@/lib/giveaways/types";

const LABELS: Record<string, string> = {
  algorithm: "The draw used the published method (yufora-draw-v1)",
  commit: "The revealed secret matches the fingerprint sealed at launch",
  poolCanonical: "The entry list is complete and in its standard order",
  poolHash: "The entry list matches the fingerprint published when entries locked",
  entrantCount: "The number of people matches",
  chain: "The random number comes from drand's quicknet",
  futureRound: "The random round was still in the future when entries locked",
  beaconHash: "The random number matches drand's signature",
  beaconSignature: "drand's signature is genuine",
  finalSeed: "The combined seed recomputes exactly",
  results: "The winner and alternates recompute exactly",
};

/**
 * Re-runs the whole draw in the visitor's browser with the same code the
 * server used (lib/giveaways/draw-core.ts), against the public entry list.
 */
export default function VerifyDraw({
  published,
  poolUrl,
}: {
  published: PublishedDraw;
  poolUrl: string;
}) {
  const [report, setReport] = useState<VerifyReport | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "error">("idle");

  async function run() {
    setStatus("running");
    try {
      const [res, core, bls] = await Promise.all([
        fetch(poolUrl, { cache: "no-store" }),
        import("@/lib/giveaways/draw-core"),
        import("@/lib/giveaways/drand-bls"),
      ]);
      if (!res.ok) throw new Error(`entry list returned ${res.status}`);
      const text = await res.text();
      setReport(
        core.verifyDraw(published, text, {
          verifyBeaconSignature: bls.verifyBeaconSignature,
        }),
      );
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div>
      <Button type="button" onClick={run} disabled={status === "running"}>
        {status === "running" ? "Checking…" : report ? "Check again" : "Check it in your browser"}
      </Button>
      {status === "error" && (
        <p role="alert" className="mt-3 text-sm text-pink-700">
          Couldn&rsquo;t load the entry list. Try again in a moment.
        </p>
      )}
      {report && (
        <div role="status" className="mt-4">
          <p className={`font-medium ${report.ok ? "text-teal-700" : "text-pink-700"}`}>
            {report.ok
              ? "Every step checks out. This is the result the published inputs produce."
              : "Something didn't match — see below."}
          </p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {report.checks.map((c) => (
              <li key={c.name} className="flex gap-2">
                <span aria-hidden="true" className={c.pass === false ? "text-pink-700" : "text-teal-700"}>
                  {c.pass === false ? "✗" : c.pass === "skipped" ? "–" : "✓"}
                </span>
                <span className="text-warm-800">
                  <span className="sr-only">{c.pass === false ? "Failed: " : "Passed: "}</span>
                  {LABELS[c.name] ?? c.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
