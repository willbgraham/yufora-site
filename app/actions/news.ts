"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { articles, newsItems, newsSources } from "@/lib/db/schema";
import { getArticleById, getItemById } from "@/lib/data/news";
import { slugify } from "@/lib/data/charity";
import { ingestOneSource } from "@/lib/news/ingest";
import { resolveLink, resolveYoutubeFeed } from "@/lib/news/link";
import { normalizeLink } from "@/lib/news/parse";
import { sanitizeExcerptHtml } from "@/lib/news/sanitize";
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

  revalidatePath("/admin/news/articles");
  redirect(`/admin/news/articles/${row.id}`);
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

  revalidatePath("/admin/news/articles");
  revalidatePath(`/admin/news/articles/${articleId}`);
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

  revalidatePath("/admin/news/articles");
  revalidatePath(`/admin/news/articles/${articleId}`);
  revalidatePath("/news");
  revalidatePath(`/news/${existing.slug}`);
  if (parsed.data === "archived") redirect("/admin/news/articles");
}

/* ---- Sources ---- */

const sourceSchema = z.object({
  type: z.enum(["rss", "youtube"]),
  url: z.string().trim().url("Enter a valid URL").max(500),
  title: z.string().trim().min(2, "Give the source a name").max(120),
});

export async function addSource(
  _prev: ArticleFormState,
  formData: FormData,
): Promise<ArticleFormState> {
  await requireStaff();

  const parsed = sourceSchema.safeParse({
    type: formData.get("type"),
    url: formData.get("url"),
    title: formData.get("title"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Please check the form",
    };
  }

  let feedUrl = parsed.data.url;
  if (parsed.data.type === "youtube") {
    const resolved = await resolveYoutubeFeed(parsed.data.url);
    if (!resolved) {
      return {
        status: "error",
        message:
          "Couldn't find that YouTube channel's feed. Paste the channel URL, its ID (UC…), or the videos.xml feed URL.",
      };
    }
    feedUrl = resolved;
  }

  await db.insert(newsSources).values({
    type: parsed.data.type,
    url: feedUrl,
    title: parsed.data.title,
  });

  revalidatePath("/admin/news/sources");
  return { status: "idle", message: "Source added." };
}

export async function toggleSource(sourceId: string, active: boolean) {
  await requireStaff();
  await db
    .update(newsSources)
    .set({ active })
    .where(eq(newsSources.id, sourceId));
  revalidatePath("/admin/news/sources");
}

export async function deleteSource(sourceId: string) {
  await requireStaff();
  await db.delete(newsSources).where(eq(newsSources.id, sourceId));
  revalidatePath("/admin/news/sources");
}

export async function fetchNow(sourceId: string) {
  await requireStaff();
  await ingestOneSource(sourceId);
  revalidatePath("/admin/news/sources");
  revalidatePath("/admin/news");
}

/* ---- Manual add-link ---- */

const linkSchema = z.object({
  url: z.string().trim().url("Paste a full URL").max(500),
});

export async function addLink(
  _prev: ArticleFormState,
  formData: FormData,
): Promise<ArticleFormState> {
  await requireStaff();

  const parsed = linkSchema.safeParse({ url: formData.get("url") });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Paste a full URL",
    };
  }

  const resolved = await resolveLink(parsed.data.url);
  if (!resolved) {
    return { status: "error", message: "Couldn't read that link." };
  }

  const link = normalizeLink(resolved.link);

  // Manual items have no source, so the DB unique index can't dedupe them —
  // check app-side on the normalized link.
  const existing = await db
    .select({ id: newsItems.id })
    .from(newsItems)
    .where(and(isNull(newsItems.sourceId), eq(newsItems.link, link)))
    .limit(1);
  if (existing.length > 0) {
    return { status: "error", message: "That link is already in the queue." };
  }

  await db.insert(newsItems).values({
    sourceId: null,
    kind: resolved.kind,
    externalId: link,
    title: resolved.title.slice(0, 300),
    excerpt: "",
    link,
    imageUrl: resolved.imageUrl,
    embedUrl: resolved.embedUrl,
    author: resolved.author,
    status: "pending",
  });

  revalidatePath("/admin/news");
  return { status: "idle", message: "Added to the review queue." };
}

/* ---- Review queue ---- */

export async function approveItem(itemId: string) {
  await requireStaff();
  const item = await getItemById(itemId);
  if (!item) return;
  await db
    .update(newsItems)
    .set({ status: "approved", approvedAt: item.approvedAt ?? new Date() })
    .where(eq(newsItems.id, itemId));
  revalidatePath("/admin/news");
  revalidatePath("/news");
}

export async function rejectItem(itemId: string) {
  await requireStaff();
  await db
    .update(newsItems)
    .set({ status: "rejected" })
    .where(eq(newsItems.id, itemId));
  revalidatePath("/admin/news");
  revalidatePath("/news");
}

export type ItemEditState = { status: "idle" | "error"; message?: string };

const itemEditSchema = z.object({
  editedTitle: z.string().trim().max(300).default(""),
  editedExcerpt: z.string().trim().max(2000).default(""),
  editorNote: z.string().trim().max(500).default(""),
});

export async function saveItemEdits(
  itemId: string,
  _prev: ItemEditState,
  formData: FormData,
): Promise<ItemEditState> {
  await requireStaff();
  const item = await getItemById(itemId);
  if (!item) return { status: "error", message: "Item not found." };

  const parsed = itemEditSchema.safeParse({
    editedTitle: formData.get("editedTitle") ?? "",
    editedExcerpt: formData.get("editedExcerpt") ?? "",
    editorNote: formData.get("editorNote") ?? "",
  });
  if (!parsed.success) {
    return { status: "error", message: "Please check the fields." };
  }

  await db
    .update(newsItems)
    .set({
      editedTitle: parsed.data.editedTitle || null,
      // Sanitize the editor's excerpt too (defense in depth + char cap).
      editedExcerpt: parsed.data.editedExcerpt
        ? sanitizeExcerptHtml(parsed.data.editedExcerpt)
        : null,
      editorNote: parsed.data.editorNote || null,
    })
    .where(eq(newsItems.id, itemId));

  revalidatePath("/admin/news");
  revalidatePath("/news");
  return { status: "idle", message: "Saved." };
}
