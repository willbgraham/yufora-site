import { formatCents } from "@/lib/money";

export default function ProgressBar({
  fundedCents,
  goalCents,
  showLabel = true,
}: {
  fundedCents: number;
  goalCents: number;
  showLabel?: boolean;
}) {
  const pct = Math.min(100, Math.round((fundedCents / goalCents) * 100));
  const funded = fundedCents >= goalCents;

  return (
    <div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${formatCents(fundedCents)} of ${formatCents(goalCents)} funded`}
        className="h-2 overflow-hidden rounded-full bg-warm-100"
      >
        <div
          className={`h-full rounded-full ${funded ? "bg-teal-600" : "bg-pink-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <p className="mt-1.5 text-sm text-warm-600">
          {funded ? (
            <span className="font-medium text-teal-700">Fully funded!</span>
          ) : (
            <>
              <span className="font-medium text-warm-900">
                {formatCents(fundedCents)}
              </span>{" "}
              of {formatCents(goalCents)}
            </>
          )}
        </p>
      )}
    </div>
  );
}
