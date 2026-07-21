import type { Metadata } from "next";
import Link from "next/link";
import { createArticle } from "@/app/actions/news";
import ArticleForm from "@/components/admin/ArticleForm";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = {
  title: "New article",
  robots: { index: false, follow: false },
};

export default async function NewArticlePage() {
  await requireStaff();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/news" className="text-sm text-warm-600 hover:text-pink-700">
        ← Newsroom
      </Link>
      <h1 className="mt-3 text-3xl">New article</h1>
      <p className="mt-2 text-warm-700">
        Write it now, publish when you&rsquo;re ready. Nothing is public until
        you hit publish.
      </p>
      <div className="mt-8 rounded-xl border border-warm-200 bg-white p-6 sm:p-8">
        <ArticleForm action={createArticle} submitLabel="Create draft" />
      </div>
    </div>
  );
}
