"use client";

import { useActionState } from "react";
import { addLink, type ArticleFormState } from "@/app/actions/news";
import { Button } from "@/components/ui/Button";

const initial: ArticleFormState = { status: "idle" };

export default function AddLinkForm() {
  const [state, formAction, pending] = useActionState(addLink, initial);

  return (
    <form action={formAction} className="space-y-3">
      <label htmlFor="link-url" className="block text-sm font-medium text-warm-900">
        Paste a link
      </label>
      <div className="flex gap-2">
        <input
          id="link-url"
          name="url"
          type="url"
          required
          placeholder="An article, a YouTube video, or an Instagram post"
          className="w-full rounded-md border border-warm-300 bg-white px-3.5 py-2.5 text-base text-warm-900 placeholder:text-warm-500 focus:border-pink-600"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Reading…" : "Add"}
        </Button>
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
      <p className="text-sm text-warm-600">
        Lands in the review queue as a draft — you write the summary before it
        goes live.
      </p>
    </form>
  );
}
