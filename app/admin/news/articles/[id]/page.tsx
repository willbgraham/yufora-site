import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateArticle } from "@/app/actions/news";
import ArticleForm from "@/components/admin/ArticleForm";
import ArticleStatusControls from "@/components/admin/ArticleStatusControls";
import { getArticleById } from "@/lib/data/news";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = {
  title: "Edit article",
  robots: { index: false, follow: false },
};

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const article = await getArticleById(id);
  if (!article || article.status === "archived") notFound();

  const boundUpdate = updateArticle.bind(null, article.id);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/news" className="text-sm text-warm-600 hover:text-pink-700">
        ← Newsroom
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl">Edit article</h1>
        {article.status === "published" && (
          <Link
            href={`/news/${article.slug}`}
            className="text-sm text-pink-700 hover:underline"
          >
            View live →
          </Link>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-warm-200 bg-white p-6">
        <ArticleStatusControls articleId={article.id} status={article.status} />
      </div>

      <div className="mt-6 rounded-xl border border-warm-200 bg-white p-6 sm:p-8">
        <ArticleForm
          action={boundUpdate}
          submitLabel="Save changes"
          defaults={{
            title: article.title,
            excerpt: article.excerpt,
            body: article.body,
            author: article.author,
          }}
        />
      </div>
    </div>
  );
}
