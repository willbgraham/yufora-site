"use client";

import { useActionState } from "react";
import type { ArticleFormState } from "@/app/actions/news";
import { Button } from "@/components/ui/Button";

const initial: ArticleFormState = { status: "idle" };

const fieldBase =
  "mt-1.5 w-full rounded-md border border-warm-300 bg-white px-3.5 py-2.5 text-base text-warm-900 placeholder:text-warm-500 focus:border-pink-600";

type Props = {
  action: (
    prev: ArticleFormState,
    formData: FormData,
  ) => Promise<ArticleFormState>;
  defaults?: {
    title: string;
    excerpt: string;
    body: string;
    author: string;
  };
  submitLabel: string;
};

export default function ArticleForm({ action, defaults, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, initial);
  const errs = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      {state.status === "error" && state.message && (
        <div
          role="alert"
          className="rounded-md border border-pink-200 bg-pink-50 p-4 text-sm text-pink-800"
        >
          {state.message}
        </div>
      )}
      {state.status === "idle" && state.message && (
        <p role="status" className="text-sm font-medium text-teal-700">
          {state.message}
        </p>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-warm-900">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={defaults?.title}
          placeholder="What's the headline?"
          aria-invalid={!!errs.title}
          aria-describedby={errs.title ? "title-error" : undefined}
          className={fieldBase}
        />
        {errs.title && (
          <p id="title-error" className="mt-1.5 text-sm text-pink-700">
            {errs.title}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="author" className="block text-sm font-medium text-warm-900">
          Byline
        </label>
        <input
          id="author"
          name="author"
          defaultValue={defaults?.author ?? "Yufora"}
          className={fieldBase}
        />
      </div>

      <div>
        <label
          htmlFor="excerpt"
          className="block text-sm font-medium text-warm-900"
        >
          Excerpt{" "}
          <span className="font-normal text-warm-500">
            (the one-line summary on the news page)
          </span>
        </label>
        <textarea
          id="excerpt"
          name="excerpt"
          rows={2}
          maxLength={400}
          defaultValue={defaults?.excerpt}
          className={fieldBase}
        />
      </div>

      <div>
        <label htmlFor="body" className="block text-sm font-medium text-warm-900">
          Body{" "}
          <span className="font-normal text-warm-500">
            (Markdown — **bold**, ## headings, [links](https://…), lists)
          </span>
        </label>
        <textarea
          id="body"
          name="body"
          rows={16}
          defaultValue={defaults?.body}
          placeholder="Write the article in Markdown…"
          className={`${fieldBase} font-mono text-sm`}
        />
      </div>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
