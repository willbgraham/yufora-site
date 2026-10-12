import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Container from "@/components/layout/Container";
import VerifyDraw from "@/components/giveaways/VerifyDraw";
import { getDrawView, getPublicGiveaway, getPublicWinnerName } from "@/lib/data/giveaways";
import { QUICKNET, roundUrl } from "@/lib/giveaways/drand";
import { dateTime } from "@/lib/giveaways/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params;
  const data = await getPublicGiveaway(slug, id);
  return data ? { title: `How the winner is chosen — ${data.giveaway.prizeName}` } : {};
}

function Hash({ value }: { value: string }) {
  return (
    <code className="mt-1 block break-all rounded bg-warm-50 px-2 py-1.5 font-mono text-xs text-warm-900">
      {value}
    </code>
  );
}

export default async function VerifyPage({ params }: Props) {
  const { slug, id } = await params;
  const data = await getPublicGiveaway(slug, id);
  if (!data) notFound();
  const { giveaway: g, charity } = data;
  const draw = await getDrawView(g.id);
  const winnerName = draw.stage === "complete" ? await getPublicWinnerName(g.id) : null;
  const tz = g.timezone;
  const base = `/s/${charity.slug}/giveaways/${g.id}`;
  const done = draw.stage === "complete";

  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <Link href={base} className="text-sm text-warm-600 hover:text-pink-700">
        ← Back to the giveaway
      </Link>
      <h1 className="mt-4 text-3xl leading-tight sm:text-4xl">
        How the winner of {g.prizeName} {done ? "was" : "will be"} chosen
      </h1>
      <p className="mt-3 text-lg text-warm-700">
        Nobody — not {charity.name}, not Yufora — can pick or change the result.
        Every step below is public, so anyone can redo the math.
      </p>

      <ol className="mt-8 space-y-6">
        <li className="rounded-xl border border-warm-200 bg-white p-5">
          <h2 className="font-sans text-lg font-semibold">
            1. Sealed at launch{g.liveAt ? ` — ${dateTime(g.liveAt, tz)}` : ""}
          </h2>
          <p className="mt-1 text-warm-700">
            The fingerprint (SHA-256) of a secret, published before the first entry:
          </p>
          {g.seedCommit && <Hash value={g.seedCommit} />}
          {!done && (
            <p className="mt-2 text-sm text-warm-600">
              When the draw happens, we reveal the secret behind this fingerprint —
              you&rsquo;ll be able to check it matches.
            </p>
          )}
        </li>

        {draw.stage !== "none" && (
          <li className="rounded-xl border border-warm-200 bg-white p-5">
            <h2 className="font-sans text-lg font-semibold">
              2. Entries locked — {dateTime(draw.stage === "complete" ? new Date(draw.published.lockedAt) : draw.lockedAt, tz)}
            </h2>
            <p className="mt-1 text-warm-700">
              {(draw.stage === "complete" ? draw.published.poolSize : draw.poolSize).toLocaleString("en-US")}{" "}
              entries from{" "}
              {(draw.stage === "complete" ? draw.published.entrantCount : draw.entrantCount).toLocaleString("en-US")}{" "}
              people. Fingerprint of the entry list:
            </p>
            <Hash value={draw.stage === "complete" ? draw.published.poolHash : draw.poolHash} />
            <a href={`${base}/verify/pool`} className="mt-2 inline-block text-sm font-medium text-pink-700 hover:underline">
              Download the anonymous entry list →
            </a>
          </li>
        )}

        {draw.stage !== "none" && (
          <li className="rounded-xl border border-warm-200 bg-white p-5">
            <h2 className="font-sans text-lg font-semibold">
              3. Public random number — drand round{" "}
              {draw.stage === "complete" ? draw.published.targetRound : draw.targetRound}
            </h2>
            <p className="mt-1 text-warm-700">
              drand is a public randomness service run by an independent group of
              organizations. This round didn&rsquo;t exist yet when entries locked
              {draw.stage === "locked" ? ` — it's published ${dateTime(draw.targetRoundAt, tz)}` : ""}.
            </p>
            {draw.stage === "complete" && (
              <>
                <Hash value={draw.published.beacon.randomness} />
                <a
                  href={roundUrl(draw.published.targetRound)}
                  rel="noopener"
                  target="_blank"
                  className="mt-2 inline-block text-sm font-medium text-pink-700 hover:underline"
                >
                  See it on drand ↗
                </a>
              </>
            )}
          </li>
        )}

        {draw.stage === "complete" && (
          <>
            <li className="rounded-xl border border-warm-200 bg-white p-5">
              <h2 className="font-sans text-lg font-semibold">4. Secret revealed</h2>
              <p className="mt-1 text-warm-700">Its SHA-256 matches the fingerprint in step 1:</p>
              <Hash value={draw.published.serverSeed} />
            </li>
            <li className="rounded-xl border border-teal-100 bg-teal-50 p-5">
              <h2 className="font-sans text-lg font-semibold">5. Result</h2>
              {winnerName && <p className="mt-1 font-medium text-teal-900">Winner: {winnerName}</p>}
              <ul className="mt-2 space-y-2 text-sm">
                {draw.published.results.map((r) => (
                  <li key={r.rank}>
                    <span className="font-medium text-warm-900">
                      {r.rank === 0 ? "Winner" : `Alternate ${r.rank}`}:
                    </span>{" "}
                    entry <span className="break-all font-mono text-xs">{r.entryId}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-warm-700">
                Entrants: your personal entry page lists your own entry numbers.
              </p>
            </li>
          </>
        )}
      </ol>

      {done && draw.stage === "complete" && (
        <section aria-labelledby="check-heading" className="mt-10">
          <h2 id="check-heading" className="text-2xl">
            Check it yourself
          </h2>
          <p className="mt-2 text-warm-700">
            This re-runs the draw in your browser from the public inputs above.
          </p>
          <div className="mt-4">
            <VerifyDraw published={draw.published} poolUrl={`${base}/verify/pool`} />
          </div>
          <details className="mt-6 rounded-lg border border-warm-200 bg-white p-4 text-sm">
            <summary className="cursor-pointer font-medium text-warm-900">The method, step by step</summary>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-warm-700">
              <li>The entry list has one line per entry, &ldquo;entry,person&rdquo;, sorted. Its SHA-256 is the step 2 fingerprint.</li>
              <li>Combined seed = HMAC-SHA256(key = the secret, message = the drand number followed by the entry-list fingerprint).</li>
              <li>Each entry&rsquo;s ticket = HMAC-SHA256(key = the combined seed, message = the entry number).</li>
              <li>The lowest ticket wins. The next lowest tickets belonging to different people are the alternates, in order.</li>
              <li>The drand signature is checked against drand&rsquo;s published key (chain {QUICKNET.hash.slice(0, 12)}…).</li>
            </ol>
          </details>
        </section>
      )}
    </Container>
  );
}
