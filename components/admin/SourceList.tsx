"use client";

import { useTransition } from "react";
import { deleteSource, fetchNow, toggleSource } from "@/app/actions/news";
import type { NewsSource } from "@/lib/data/news";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function SourceList({ sources }: { sources: NewsSource[] }) {
  const [pending, startTransition] = useTransition();

  if (sources.length === 0) {
    return (
      <p className="text-sm text-warm-600">
        No sources yet. Add a blog or YouTube channel above.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {sources.map((s) => (
        <li
          key={s.id}
          className="rounded-lg border border-warm-200 bg-white p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2">
                <span className="font-medium text-warm-900">{s.title}</span>
                <span className="rounded-full bg-warm-100 px-2 py-0.5 text-xs text-warm-600">
                  {s.type === "youtube" ? "YouTube" : "RSS"}
                </span>
                {!s.active && (
                  <span className="rounded-full bg-warm-100 px-2 py-0.5 text-xs text-warm-500">
                    Paused
                  </span>
                )}
              </p>
              <p className="mt-0.5 break-all text-xs text-warm-500">{s.url}</p>
              <p className="mt-1 text-xs text-warm-500">
                {s.lastFetchedAt ? (
                  <>
                    Last fetched {dateFmt.format(s.lastFetchedAt)} ·{" "}
                    {s.lastStatus === "ok" ? (
                      <span className="text-teal-700">ok</span>
                    ) : (
                      <span className="text-pink-700">
                        {s.lastError ?? "error"}
                      </span>
                    )}
                  </>
                ) : (
                  "Never fetched"
                )}
              </p>
            </div>
            <div className="flex flex-none flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(() => fetchNow(s.id))}
                className="rounded-md bg-pink-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-pink-700 disabled:opacity-60"
              >
                {pending ? "…" : "Fetch now"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(() => toggleSource(s.id, !s.active))}
                className="rounded-md px-2.5 py-1.5 text-xs font-medium text-warm-600 hover:bg-warm-100"
              >
                {s.active ? "Pause" : "Resume"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (
                    confirm(
                      `Delete "${s.title}"? Its pending items are removed too.`,
                    )
                  ) {
                    startTransition(() => deleteSource(s.id));
                  }
                }}
                className="rounded-md px-2.5 py-1.5 text-xs font-medium text-warm-600 hover:bg-warm-100 hover:text-pink-700"
              >
                Delete
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
