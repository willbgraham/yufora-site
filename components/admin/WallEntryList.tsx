"use client";

import { useTransition } from "react";
import { deleteWallEntry } from "@/app/actions/wall";
import { formatCents } from "@/lib/money";

type Entry = { id: string; name: string; amountCents: number | null };

export default function WallEntryList({ entries }: { entries: Entry[] }) {
  const [pending, startTransition] = useTransition();

  if (entries.length === 0) {
    return (
      <p className="text-sm text-warm-600">
        No recognized supporters yet — names you add appear on the wall
        immediately.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {entries.map((e) => (
        <li
          key={e.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-warm-200 bg-white px-3.5 py-2.5"
        >
          <p className="min-w-0 truncate text-sm text-warm-900">
            <span className="font-medium">{e.name}</span>
            {e.amountCents !== null && (
              <span className="text-warm-500"> · {formatCents(e.amountCents)}</span>
            )}
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (confirm(`Remove ${e.name} from the wall?`)) {
                startTransition(() => deleteWallEntry(e.id));
              }
            }}
            className="flex-none rounded-md px-2.5 py-1.5 text-xs font-medium text-warm-600 hover:bg-warm-100 hover:text-pink-700"
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
