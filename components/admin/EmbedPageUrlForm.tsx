"use client";

import { useActionState } from "react";
import { saveEmbedPageUrl, type SettingsState } from "@/app/actions/settings";

const initial: SettingsState = { status: "idle" };

export default function EmbedPageUrlForm({
  defaultValue,
}: {
  defaultValue: string;
}) {
  const [state, formAction, pending] = useActionState(saveEmbedPageUrl, initial);

  return (
    <form action={formAction} className="mt-4">
      <label
        htmlFor="embedPageUrl"
        className="block text-sm font-medium text-warm-900"
      >
        Where on your site does the shop live?
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="embedPageUrl"
          name="embedPageUrl"
          type="url"
          defaultValue={defaultValue}
          placeholder="https://yoursite.org/wishlist"
          aria-invalid={state.status === "error"}
          aria-describedby="embedPageUrl-hint"
          className="w-full rounded-md border border-warm-300 bg-white px-3 py-2 text-sm text-warm-900 placeholder:text-warm-500 focus:border-pink-600"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-pink-600 px-3 py-2 text-sm font-medium text-white hover:bg-pink-700 disabled:opacity-60"
        >
          {pending ? "…" : "Save"}
        </button>
      </div>
      {state.status === "error" && state.message ? (
        <p role="alert" className="mt-1.5 text-sm text-pink-700">
          {state.message}
        </p>
      ) : state.message ? (
        <p role="status" className="mt-1.5 text-sm font-medium text-teal-700">
          {state.message}
        </p>
      ) : (
        <p id="embedPageUrl-hint" className="mt-1.5 text-sm text-warm-600">
          After donating, supporters come back to this page — not to ours.
        </p>
      )}
    </form>
  );
}
