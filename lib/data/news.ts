import "server-only";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { articles, newsItems, newsSources } from "@/lib/db/schema";

export type Article = typeof articles.$inferSelect;
export type NewsSource = typeof newsSources.$inferSelect;
export type NewsItem = typeof newsItems.$inferSelect;

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

/* ---- Curated sources & items ---- */

export async function getSources(): Promise<NewsSource[]> {
  return db.select().from(newsSources).orderBy(desc(newsSources.createdAt));
}

/** Pending items for the review queue, newest first. */
export async function getPendingItems(): Promise<NewsItem[]> {
  return db
    .select()
    .from(newsItems)
    .where(eq(newsItems.status, "pending"))
    .orderBy(desc(newsItems.publishedAt), desc(newsItems.createdAt));
}

export async function getItemById(id: string): Promise<NewsItem | null> {
  const rows = await db
    .select()
    .from(newsItems)
    .where(eq(newsItems.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/** Approved items for the public /news feed. */
export async function getApprovedItems(): Promise<NewsItem[]> {
  return db
    .select()
    .from(newsItems)
    .where(eq(newsItems.status, "approved"))
    .orderBy(desc(newsItems.approvedAt));
}

export function itemDisplayTitle(item: NewsItem): string {
  return item.editedTitle?.trim() || item.title;
}
export function itemDisplayExcerpt(item: NewsItem): string {
  return item.editedExcerpt?.trim() || item.excerpt;
}
