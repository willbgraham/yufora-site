import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Section from "@/components/layout/Section";
import Markdown from "@/components/news/Markdown";
import { getPublishedArticleBySlug } from "@/lib/data/news";

type Props = { params: Promise<{ slug: string }> };

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "long" });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.excerpt || undefined,
    openGraph: {
      type: "article",
      title: article.title,
      description: article.excerpt || undefined,
      publishedTime: article.publishedAt?.toISOString(),
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  if (!article) notFound();

  return (
    <Section>
      <article className="mx-auto max-w-2xl">
        <Link href="/news" className="text-sm text-warm-600 hover:text-pink-700">
          ← News
        </Link>
        <p className="mt-6 text-sm text-warm-500">
          {article.publishedAt ? dateFmt.format(article.publishedAt) : ""} ·{" "}
          {article.author}
        </p>
        <h1 className="mt-1.5 text-[length:var(--text-display)] leading-[1.1]">
          {article.title}
        </h1>
        {article.excerpt && (
          <p className="mt-4 text-xl text-warm-700">{article.excerpt}</p>
        )}
        <div className="mt-8">
          <Markdown>{article.body}</Markdown>
        </div>
      </article>
    </Section>
  );
}
