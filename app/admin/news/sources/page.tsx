import type { Metadata } from "next";
import AddLinkForm from "@/components/admin/AddLinkForm";
import AddSourceForm from "@/components/admin/AddSourceForm";
import NewsroomTabs from "@/components/admin/NewsroomTabs";
import SourceList from "@/components/admin/SourceList";
import { getSources } from "@/lib/data/news";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = {
  title: "Sources",
  robots: { index: false, follow: false },
};

export default async function SourcesPage() {
  await requireStaff();
  const sources = await getSources();

  return (
    <div>
      <h1 className="text-3xl">Newsroom</h1>
      <NewsroomTabs active="/admin/news/sources" />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-warm-200 bg-white p-6">
          <h2 className="text-xl">Add a feed</h2>
          <p className="mt-1 text-sm text-warm-700">
            A charity blog or a YouTube channel. New posts arrive in the review
            queue.
          </p>
          <div className="mt-5">
            <AddSourceForm />
          </div>
        </section>

        <section className="rounded-xl border border-warm-200 bg-white p-6">
          <h2 className="text-xl">Add a single link</h2>
          <p className="mt-1 text-sm text-warm-700">
            A one-off article, video, or Instagram post you want to feature.
          </p>
          <div className="mt-5">
            <AddLinkForm />
          </div>
        </section>
      </div>

      <section className="mt-6">
        <h2 className="text-xl">Your sources</h2>
        <div className="mt-4">
          <SourceList sources={sources} />
        </div>
      </section>
    </div>
  );
}
