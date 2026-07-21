import "server-only";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { articles } from "@/lib/db/schema";

export type Article = typeof articles.$inferSelect;

/** All non-archived articles for the admin list, newest first. */
export async function getArticlesForAdmin(): Promise<Article[]> {
  return db
    .select()
    .from(articles)
    .where(ne(articles.status, "archived"))
    .orderBy(desc(articles.createdAt));
}

/** One article by id, for the admin editor. */
export async function getArticleById(id: string): Promise<Article | null> {
  const rows = await db
    .select()
    .from(articles)
    .where(eq(articles.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/** Published articles for the public /news feed, newest published first. */
export async function getPublishedArticles(): Promise<Article[]> {
  return db
    .select()
    .from(articles)
    .where(eq(articles.status, "published"))
    .orderBy(desc(articles.publishedAt));
}

/** One published article by slug, for /news/[slug]. */
export async function getPublishedArticleBySlug(
  slug: string,
): Promise<Article | null> {
  const rows = await db
    .select()
    .from(articles)
    .where(and(eq(articles.slug, slug), eq(articles.status, "published")))
    .limit(1);
  return rows[0] ?? null;
}
