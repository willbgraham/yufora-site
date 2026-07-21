import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { getArticlesForAdmin } from "@/lib/data/news";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = {
  title: "Newsroom",
  robots: { index: false, follow: false },
};

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export default async function NewsroomPage() {
  await requireStaff();
  const items = await getArticlesForAdmin();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl">Newsroom</h1>
          <p className="mt-1 text-sm text-warm-600">
            Write and publish original articles. Curated news from other
            sources arrives here next.
          </p>
        </div>
        <ButtonLink href="/admin/news/new">New article</ButtonLink>
      </div>

      {items.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-warm-300 bg-white p-10 text-center">
          <p className="text-lg text-warm-900">No articles yet.</p>
          <p className="mx-auto mt-2 max-w-md text-warm-700">
            Your first piece can be anything — a launch note, an impact story,
            a guide for the nonprofits you work with.
          </p>
          <ButtonLink href="/admin/news/new" className="mt-6">
            Write your first article
          </ButtonLink>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-warm-100 rounded-xl border border-warm-200 bg-white">
          {items.map((a) => (
            <li key={a.id}>
              <Link
                href={`/admin/news/${a.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-warm-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-lg text-warm-900">{a.title}</p>
                  <p className="mt-0.5 text-sm text-warm-600">
                    {a.author} · {dateFmt.format(a.createdAt)}
                  </p>
                </div>
                <span
                  className={`flex-none rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    a.status === "published"
                      ? "bg-teal-100 text-teal-700"
                      : "bg-warm-100 text-warm-600"
                  }`}
                >
                  {a.status === "published" ? "Live" : "Draft"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
