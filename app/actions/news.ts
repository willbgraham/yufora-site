"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { articles } from "@/lib/db/schema";
import { getArticleById } from "@/lib/data/news";
import { slugify } from "@/lib/data/charity";
import { requireStaff } from "@/lib/session";

export type ArticleFormState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

const articleSchema = z.object({
  title: z.string().trim().min(2, "Please give the article a title").max(200),
  excerpt: z.string().trim().max(400).default(""),
  body: z.string().trim().max(50000).default(""),
  author: z.string().trim().max(120).default("Yufora"),
});

/** base, base-2, base-3 … first free slug, excluding `exceptId` on edit. */
async function uniqueSlug(title: string, exceptId?: string): Promise<string> {
  const base = slugify(title) || "article";
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const taken = await db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.slug, slug))
      .limit(1);
    if (taken.length === 0 || taken[0].id === exceptId) return slug;
  }
}

function validate(formData: FormData):
  | { ok: true; values: z.infer<typeof articleSchema> }
  | { ok: false; state: ArticleFormState } {
  const parsed = articleSchema.safeParse({
    title: formData.get("title"),
    excerpt: formData.get("excerpt") ?? "",
    body: formData.get("body") ?? "",
    author: formData.get("author") || "Yufora",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return {
      ok: false,
      state: {
        status: "error",
        message: "Please check the highlighted fields.",
        fieldErrors,
      },
    };
  }
  return { ok: true, values: parsed.data };
}

export async function createArticle(
  _prev: ArticleFormState,
  formData: FormData,
): Promise<ArticleFormState> {
  await requireStaff();

  const result = validate(formData);
  if (!result.ok) return result.state;

  const slug = await uniqueSlug(result.values.title);
  const [row] = await db
    .insert(articles)
    .values({ ...result.values, slug })
    .returning({ id: articles.id });

  revalidatePath("/admin/news");
  redirect(`/admin/news/${row.id}`);
}

export async function updateArticle(
  articleId: string,
  _prev: ArticleFormState,
  formData: FormData,
): Promise<ArticleFormState> {
  await requireStaff();
  const existing = await getArticleById(articleId);
  if (!existing) return { status: "error", message: "Article not found." };

  const result = validate(formData);
  if (!result.ok) return result.state;

  // Keep the slug stable once set; only regenerate if the title changed and
  // the slug still matches the old title (avoids breaking shared links).
  const slug =
    existing.slug === (await uniqueSlug(existing.title, articleId))
      ? await uniqueSlug(result.values.title, articleId)
      : existing.slug;

  await db
    .update(articles)
    .set({ ...result.values, slug })
    .where(eq(articles.id, articleId));

  revalidatePath("/admin/news");
  revalidatePath(`/admin/news/${articleId}`);
  revalidatePath("/news");
  revalidatePath(`/news/${slug}`);
  return { status: "idle", message: "Saved." };
}

const statusSchema = z.enum(["draft", "published", "archived"]);

export async function setArticleStatus(articleId: string, status: string) {
  await requireStaff();
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return;

  const existing = await getArticleById(articleId);
  if (!existing) return;

  await db
    .update(articles)
    .set({
      status: parsed.data,
      // Stamp publishedAt the first time it goes live; keep it thereafter.
      publishedAt:
        parsed.data === "published" && !existing.publishedAt
          ? new Date()
          : existing.publishedAt,
    })
    .where(and(eq(articles.id, articleId), ne(articles.status, parsed.data)));

  revalidatePath("/admin/news");
  revalidatePath(`/admin/news/${articleId}`);
  revalidatePath("/news");
  revalidatePath(`/news/${existing.slug}`);
  if (parsed.data === "archived") redirect("/admin/news");
}
