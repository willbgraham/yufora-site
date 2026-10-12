import { STATUS_TONE, displayStatus, statusLabel } from "@/lib/giveaways/display";

export default function GiveawayStatusChip({
  giveaway,
  now,
  short = false,
}: {
  giveaway: { status: string; startsAt: Date; endsAt: Date; drawAt: Date; timezone: string };
  now: Date;
  short?: boolean;
}) {
  const s = displayStatus(giveaway, now);
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONE[s]}`}>
      {statusLabel(giveaway, now, short)}
    </span>
  );
}
