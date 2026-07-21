import type { TickerData } from "@/lib/data/ticker";
import { timeAgo } from "@/lib/data/wall";
import { formatCents } from "@/lib/money";

/**
 * The standalone donor wall: live anonymous giving activity from the
 * charity's own Stripe, plus their curated recognized-supporters list.
 */
export default function Ticker({ data }: { data: TickerData }) {
  const hasActivity = data.connected && data.items.length > 0;

  return (
    <div>
      {data.connected && (
        <div className="rounded-xl bg-pink-50 px-5 py-4 text-center">
          <p className="font-display text-3xl text-pink-700">
            {formatCents(data.monthTotalCents)}
          </p>
          <p className="mt-0.5 text-sm text-warm-700">
            raised this month
            {data.monthCount > 0 && (
              <> · {data.monthCount} gift{data.monthCount === 1 ? "" : "s"}</>
            )}
          </p>
        </div>
      )}

      {hasActivity && (
        <ul className="mt-3 space-y-2">
          {data.items.map((item, i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-lg border border-warm-100 bg-white px-3.5 py-2.5"
            >
              <span
                aria-hidden="true"
                className="flex size-8 flex-none items-center justify-center rounded-full bg-teal-100 text-teal-700"
              >
                ♥
              </span>
              <p className="min-w-0 flex-1 truncate text-sm text-warm-900">
                Someone gave{" "}
                <span className="font-medium text-pink-700">
                  {formatCents(item.amountCents)}
                </span>
              </p>
              <span className="flex-none text-xs text-warm-500">
                {timeAgo(item.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {data.connected && !hasActivity && data.recognized.length === 0 && (
        <p className="mt-3 rounded-lg border border-dashed border-warm-300 p-6 text-center text-sm text-warm-600">
          Gifts appear here the moment they happen.
        </p>
      )}

      {data.recognized.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 font-display text-lg text-warm-900">
            Recognized supporters
          </h3>
          <ul className="flex flex-wrap gap-2">
            {data.recognized.map((r, i) => (
              <li
                key={i}
                className="rounded-full border border-warm-200 bg-white px-3.5 py-1.5 text-sm text-warm-800"
              >
                <span className="font-medium">{r.name}</span>
                {r.amountCents !== null && (
                  <span className="text-warm-500"> · {formatCents(r.amountCents)}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
