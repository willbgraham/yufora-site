"use client";

import { useActionState } from "react";
import { addSource } from "@/app/actions/news";
import type { ArticleFormState } from "@/app/actions/news";
import { Button } from "@/components/ui/Button";

const initial: ArticleFormState = { status: "idle" };

const fieldBase =
  "mt-1.5 w-full rounded-md border border-warm-300 bg-white px-3.5 py-2.5 text-base text-warm-900 placeholder:text-warm-500 focus:border-pink-600";

export default function AddSourceForm() {
  const [state, formAction, pending] = useActionState(addSource, initial);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-warm-900">
            Type
          </label>
          <select id="type" name="type" defaultValue="rss" className={fieldBase}>
            <option value="rss">Blog (RSS/Atom)</option>
            <option value="youtube">YouTube channel</option>
          </select>
        </div>
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-warm-900">
            Name{" "}
            <span className="font-normal text-warm-500">(shown as the credit)</span>
          </label>
          <input
            id="title"
            name="title"
            required
            placeholder="e.g. Riverside Rescue Blog"
            className={fieldBase}
          />
        </div>
      </div>
      <div>
        <label htmlFor="url" className="block text-sm font-medium text-warm-900">
          Feed or channel URL
        </label>
        <input
          id="url"
          name="url"
          type="url"
          required
          placeholder="https://example.org/feed  ·  or a youtube.com/@channel URL"
          className={fieldBase}
        />
        <p className="mt-1.5 text-sm text-warm-600">
          Blogs: the site&rsquo;s RSS/Atom URL. YouTube: the channel URL, its ID
          (UC…), or the videos.xml feed — we&rsquo;ll resolve it.
        </p>
      </div>

      {state.status === "error" && state.message && (
        <p role="alert" className="text-sm text-pink-700">
          {state.message}
        </p>
      )}
      {state.status === "idle" && state.message && (
        <p role="status" className="text-sm font-medium text-teal-700">
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add source"}
      </Button>
    </form>
  );
}
