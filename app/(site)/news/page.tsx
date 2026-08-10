import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/layout/Section";
import SanitizedExcerpt from "@/components/news/SanitizedExcerpt";
import {
  getApprovedItems,
  getPublishedArticles,
  itemDisplayExcerpt,
  itemDisplayTitle,
  type Article,
  type NewsItem,
} from "@/lib/data/news";

// Reads the database, which isn't available at build time (graceful-
// degradation design) — render on request, like the shop pages.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "News",
  description:
    "Stories, guides, and updates for nonprofits — from the Yufora newsroom.",
};

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "long" });

type FeedEntry =
  | { kind: "article"; sortDate: Date; article: Article }
  | { kind: "item"; sortDate: Date; item: NewsItem };

export default async function NewsPage() {
  const [articles, items] = await Promise.all([
    getPublishedArticles(),
    getApprovedItems(),
  ]);

  const feed: FeedEntry[] = [
    ...articles.map((a): FeedEntry => ({
      kind: "article",
      sortDate: a.publishedAt ?? a.createdAt,
      article: a,
    })),
    ...items.map((i): FeedEntry => ({
      kind: "item",
      sortDate: i.approvedAt ?? i.createdAt,
      item: i,
    })),
  ].sort((x, y) => y.sortDate.getTime() - x.sortDate.getTime());

  return (
    <Section>
      <div className="max-w-2xl">
        <h1 className="text-[length:var(--text-display)] leading-[1.08]">News</h1>
        <p className="mt-4 text-lg text-warm-700">
          Stories, guides, and updates for the nonprofits we work with.
        </p>
      </div>

      {feed.length === 0 ? (
        <p className="mt-12 rounded-xl border border-dashed border-warm-300 p-10 text-center text-warm-600">
          Nothing published yet — check back soon.
        </p>
      ) : (
        <ul className="mt-12 grid gap-8">
          {feed.map((entry) =>
            entry.kind === "article" ? (
              <ArticleRow key={`a-${entry.article.id}`} article={entry.article} />
            ) : (
              <ItemRow key={`i-${entry.item.id}`} item={entry.item} />
            ),
          )}
        </ul>
      )}
    </Section>
  );
}

function ArticleRow({ article }: { article: Article }) {
  return (
    <li className="border-b border-warm-100 pb-8 last:border-0">
      <p className="text-sm text-warm-500">
        {article.publishedAt ? dateFmt.format(article.publishedAt) : ""} ·{" "}
        {article.author}
      </p>
      <h2 className="mt-1.5 text-2xl sm:text-3xl">
        <Link href={`/news/${article.slug}`} className="hover:text-pink-700">
          {article.title}
        </Link>
      </h2>
      {article.excerpt && (
        <p className="mt-2 max-w-2xl text-warm-700">{article.excerpt}</p>
      )}
      <Link
        href={`/news/${article.slug}`}
        className="mt-3 inline-block text-sm font-medium text-pink-700 hover:underline"
      >
        Read more →
      </Link>
    </li>
  );
}

/** Curated item — links OUT to the canonical source with attribution. */
function ItemRow({ item }: { item: NewsItem }) {
  const excerpt = itemDisplayExcerpt(item);
  return (
    <li className="border-b border-warm-100 pb-8 last:border-0">
      <p className="text-sm text-warm-500">
        {item.publishedAt ? dateFmt.format(item.publishedAt) : ""}
        {item.author ? ` · ${item.author}` : ""}
      </p>
      <h2 className="mt-1.5 text-2xl sm:text-3xl">
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
          className="hover:text-pink-700"
        >
          {itemDisplayTitle(item)}
        </a>
      </h2>
      {excerpt && (
        <SanitizedExcerpt html={excerpt} className="mt-2 max-w-2xl text-warm-700" />
      )}
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer nofollow ugc"
        className="mt-3 inline-block text-sm font-medium text-pink-700 hover:underline"
      >
        Read at the source →
      </a>
    </li>
  );
}
