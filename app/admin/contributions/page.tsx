import Link from "next/link";
import { redirect } from "next/navigation";
import { getCharityForUser } from "@/lib/data/charity";
import {
  getContributionsForCharity,
  getTotalsForCharity,
} from "@/lib/data/contributions";
import { formatCents } from "@/lib/money";
import { requireSession } from "@/lib/session";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function ContributionsPage() {
  const session = await requireSession();
  const charity = await getCharityForUser(session.user.id);
  if (!charity) redirect("/admin");

  const [rows, totals] = await Promise.all([
    getContributionsForCharity(charity.id),
    getTotalsForCharity(charity.id),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">Contributions</h1>
          <p className="mt-1 text-sm text-warm-600">
            {totals.count === 0 ? (
              "Every gift shows up here the moment it lands."
            ) : (
              <>
                <span className="font-medium text-warm-900">
                  {formatCents(totals.totalCents)}
                </span>{" "}
                raised across {totals.count} gift{totals.count === 1 ? "" : "s"}
              </>
            )}
          </p>
        </div>
        {rows.length > 0 && (
          <a
            href="/admin/contributions/export"
            className="rounded-md px-3 py-2 text-sm font-medium text-pink-700 hover:bg-pink-50"
          >
            Download CSV
          </a>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-warm-300 bg-white p-10 text-center">
          <p className="text-lg text-warm-900">No contributions yet.</p>
          <p className="mx-auto mt-2 max-w-md text-warm-700">
            Once Stripe is connected and your products are published, every
            donation appears here — with the donor&rsquo;s details, which are
            yours to keep.
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border border-warm-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-warm-200 text-warm-600">
                <th scope="col" className="px-4 py-3 font-medium">Date</th>
                <th scope="col" className="px-4 py-3 font-medium">Product</th>
                <th scope="col" className="px-4 py-3 font-medium">Donor</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Amount
                </th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-warm-100 last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-warm-600">
                    {dateFmt.format(row.createdAt)}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-warm-900">
                    {row.productTitle}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-warm-900">{row.donorName ?? "—"}</div>
                    <div className="text-warm-600">{row.donorEmail ?? ""}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-warm-900">
                    {formatCents(row.amountCents)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.status === "succeeded"
                          ? "bg-teal-100 text-teal-700"
                          : row.status === "refunded"
                            ? "bg-warm-100 text-warm-600"
                            : "bg-pink-100 text-pink-700"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 text-sm text-warm-600">
        <Link href="/admin" className="text-pink-700 hover:underline">
          ← Back to dashboard
        </Link>
      </p>
    </div>
  );
}
