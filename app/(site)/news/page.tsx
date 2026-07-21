import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/layout/Section";
import { getPublishedArticles } from "@/lib/data/news";

// Reads the database, which isn't available at build time (graceful-
// degradation design) — render on request, like the shop pages.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "News",
  description:
    "Stories, guides, and updates for nonprofits — from the Yufora newsroom.",
};

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "long" });

export default async function NewsPage() {
  const articles = await getPublishedArticles();

  return (
    <Section>
      <div className="max-w-2xl">
        <h1 className="text-[length:var(--text-display)] leading-[1.08]">
          News
        </h1>
        <p className="mt-4 text-lg text-warm-700">
          Stories, guides, and updates for the nonprofits we work with.
        </p>
      </div>

      {articles.length === 0 ? (
        <p className="mt-12 rounded-xl border border-dashed border-warm-300 p-10 text-center text-warm-600">
          Nothing published yet — check back soon.
        </p>
      ) : (
        <ul className="mt-12 grid gap-8">
          {articles.map((a) => (
            <li key={a.id} className="border-b border-warm-100 pb-8 last:border-0">
              <p className="text-sm text-warm-500">
                {a.publishedAt ? dateFmt.format(a.publishedAt) : ""} · {a.author}
              </p>
              <h2 className="mt-1.5 text-2xl sm:text-3xl">
                <Link href={`/news/${a.slug}`} className="hover:text-pink-700">
                  {a.title}
                </Link>
              </h2>
              {a.excerpt && (
                <p className="mt-2 max-w-2xl text-warm-700">{a.excerpt}</p>
              )}
              <Link
                href={`/news/${a.slug}`}
                className="mt-3 inline-block text-sm font-medium text-pink-700 hover:underline"
              >
                Read more →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
