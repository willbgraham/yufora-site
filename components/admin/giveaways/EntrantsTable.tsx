import { shortDate } from "@/lib/giveaways/format";

type Row = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  state: string;
  confirmedAt: Date | null;
  status: string;
  optedIn: boolean;
  createdAt: Date;
  entries: number;
};

export default function EntrantsTable({
  rows,
  timezone,
  exportHref,
}: {
  rows: Row[];
  timezone: string;
  exportHref: string;
}) {
  return (
    <section aria-labelledby="entrants-heading" className="rounded-xl border border-warm-200 bg-white p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="entrants-heading" className="text-xl">Entrants</h2>
        <p className="text-sm">
          <a href={exportHref} className="font-medium text-pink-700 hover:underline">Download everyone (CSV)</a>
          {" · "}
          <a href={`${exportHref}?list=1`} className="font-medium text-pink-700 hover:underline">
            People who joined your list (CSV)
          </a>
        </p>
      </div>
      <p className="mt-1 text-sm text-warm-600">
        Only add people marked &ldquo;Joined your list&rdquo; to your newsletter — the others entered
        the giveaway, not your mailing list.
      </p>
      {rows.length === 0 ? (
        <p className="mt-4 text-warm-600">No entries yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-warm-600">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">Name</th>
                <th scope="col" className="py-2 pr-4 font-medium">Email</th>
                <th scope="col" className="py-2 pr-4 font-medium">State</th>
                <th scope="col" className="py-2 pr-4 font-medium">Entries</th>
                <th scope="col" className="py-2 pr-4 font-medium">Status</th>
                <th scope="col" className="py-2 font-medium">Joined list</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="py-2 pr-4 text-warm-900">{r.firstName} {r.lastName}</td>
                  <td className="py-2 pr-4 text-warm-700">{r.email}</td>
                  <td className="py-2 pr-4 text-warm-700">{r.state}</td>
                  <td className="py-2 pr-4 text-warm-700">{Number(r.entries)}</td>
                  <td className="py-2 pr-4 text-warm-700">
                    {r.status !== "active"
                      ? "Not eligible"
                      : r.confirmedAt
                        ? `Confirmed ${shortDate(r.confirmedAt, timezone)}`
                        : "Waiting to confirm"}
                  </td>
                  <td className="py-2 text-warm-700">{r.optedIn ? "Yes" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length >= 50 && <p className="mt-2 text-sm text-warm-600">Showing the latest 50 — download the CSV for everyone.</p>}
        </div>
      )}
    </section>
  );
}
