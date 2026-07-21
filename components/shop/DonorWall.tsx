import type { TopSupporter, WallEntry } from "@/lib/data/wall";
import { timeAgo } from "@/lib/data/wall";
import { formatCents } from "@/lib/money";

/** Stable avatar color per name — warm palette, chosen by simple hash. */
const AVATAR_COLORS = [
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
  "bg-warm-200 text-warm-800",
  "bg-pink-500 text-white",
  "bg-teal-600 text-white",
];

function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase() || "♥";
}

function colorOf(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function Avatar({ name }: { name: string | null }) {
  if (!name) {
    return (
      <span
        aria-hidden="true"
        className="flex size-9 flex-none items-center justify-center rounded-full bg-warm-100 text-warm-500"
      >
        ♥
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex size-9 flex-none items-center justify-center rounded-full text-sm font-semibold ${colorOf(name)}`}
    >
      {initialsOf(name)}
    </span>
  );
}

export function RecentWall({ entries }: { entries: WallEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-warm-300 p-6 text-center text-sm text-warm-600">
        Be the first name on this wall.
      </p>
    );
  }
  return (
    <ul className="space-y-2.5">
      {entries.map((e, i) => (
        <li
          key={i}
          className="flex items-center gap-3 rounded-lg border border-warm-100 bg-white px-3.5 py-2.5"
        >
          <Avatar name={e.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-warm-900">
              <span className="font-medium">{e.name ?? "Someone"}</span>
              {e.amountCents !== null && (
                <span className="text-pink-700"> gave {formatCents(e.amountCents)}</span>
              )}{" "}
              <span className="text-warm-600">
                toward {e.productTitle}
              </span>
            </p>
          </div>
          <span className="flex-none text-xs text-warm-500">
            {timeAgo(e.createdAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function TopWall({ supporters }: { supporters: TopSupporter[] }) {
  if (supporters.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-warm-300 p-6 text-center text-sm text-warm-600">
        Top supporters appear here as gifts come in.
      </p>
    );
  }
  return (
    <ol className="space-y-2.5">
      {supporters.map((s, i) => (
        <li
          key={s.name}
          className="flex items-center gap-3 rounded-lg border border-warm-100 bg-white px-3.5 py-2.5"
        >
          <span className="w-5 flex-none text-center font-display text-lg text-pink-300">
            {i + 1}
          </span>
          <Avatar name={s.name} />
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-warm-900">
            {s.name}
          </p>
          <span className="flex-none text-sm font-medium text-pink-700">
            {formatCents(s.totalCents)}
          </span>
        </li>
      ))}
    </ol>
  );
}
