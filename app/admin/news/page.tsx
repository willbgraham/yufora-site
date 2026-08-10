import type { Metadata } from "next";
import NewsroomTabs from "@/components/admin/NewsroomTabs";
import ReviewControls from "@/components/admin/ReviewControls";
import SanitizedExcerpt from "@/components/news/SanitizedExcerpt";
import { ButtonLink } from "@/components/ui/Button";
import { getPendingItems } from "@/lib/data/news";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = {
  title: "Review queue",
  robots: { index: false, follow: false },
};

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

const KIND_LABEL: Record<string, string> = {
  article: "Article",
  youtube: "Video",
  instagram: "Instagram",
};

export default async function ReviewQueuePage() {
  await requireStaff();
  const items = await getPendingItems();

  return (
    <div>
      <h1 className="text-3xl">Newsroom</h1>
      <NewsroomTabs active="/admin/news" />

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-sm text-warm-600">
          {items.length === 0
            ? "Nothing waiting for review."
            : `${items.length} item${items.length === 1 ? "" : "s"} waiting for review.`}
        </p>
        <ButtonLink href="/admin/news/sources" variant="secondary">
          Manage sources
        </ButtonLink>
      </div>

      {items.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-warm-300 bg-white p-10 text-center">
          <p className="text-lg text-warm-900">The queue is empty.</p>
          <p className="mx-auto mt-2 max-w-md text-warm-700">
            Add a blog or YouTube source, or paste a link — new items land here
            for you to edit and approve.
          </p>
          <ButtonLink href="/admin/news/sources" className="mt-6">
            Add a source
          </ButtonLink>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-warm-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-warm-500">
                <span className="rounded-full bg-warm-100 px-2 py-0.5 font-medium text-warm-600">
                  {KIND_LABEL[item.kind] ?? "Item"}
                </span>
                {item.author && <span>{item.author}</span>}
                {item.publishedAt && (
                  <span>· {dateFmt.format(item.publishedAt)}</span>
                )}
              </div>

              <h2 className="mt-2 text-lg text-warm-900">
                {item.editedTitle?.trim() || item.title}
              </h2>

              {/* Render the editor's summary if set, else the sanitized feed
                  excerpt (re-sanitized here). */}
              {item.editedExcerpt?.trim() ? (
                <SanitizedExcerpt
                  html={item.editedExcerpt}
                  className="mt-2 text-sm text-warm-700"
                />
              ) : (
                <SanitizedExcerpt
                  html={item.excerpt}
                  className="mt-2 text-sm text-warm-700"
                />
              )}

              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-2 inline-block break-all text-xs text-pink-700 hover:underline"
              >
                {item.link}
              </a>

              <ReviewControls
                itemId={item.id}
                defaults={{
                  editedTitle: item.editedTitle ?? "",
                  editedExcerpt: item.editedExcerpt ?? "",
                  editorNote: item.editorNote ?? "",
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
