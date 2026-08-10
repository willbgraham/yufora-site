"use client";

import { useActionState } from "react";
import { addWallEntry, type WallFormState } from "@/app/actions/wall";
import { Button } from "@/components/ui/Button";

const initial: WallFormState = { status: "idle" };

export default function WallEntryForm() {
  const [state, formAction, pending] = useActionState(addWallEntry, initial);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-warm-900">
            Supporter name
          </label>
          <input
            id="name"
            name="name"
            required
            placeholder="e.g. Dana O."
            className="mt-1.5 w-full rounded-md border border-warm-300 bg-white px-3.5 py-2.5 text-base text-warm-900 placeholder:text-warm-500 focus:border-pink-600"
          />
        </div>
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-warm-900">
            Amount{" "}
            <span className="font-normal text-warm-500">(optional)</span>
          </label>
          <div className="relative mt-1.5">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-warm-500"
            >
              $
            </span>
            <input
              id="amount"
              name="amount"
              inputMode="decimal"
              placeholder="250"
              className="w-full rounded-md border border-warm-300 bg-white py-2.5 pl-8 pr-3.5 text-base text-warm-900 placeholder:text-warm-500 focus:border-pink-600"
            />
          </div>
        </div>
      </div>

      <label className="flex items-start gap-2.5 text-sm text-warm-700">
        <input
          type="checkbox"
          name="permission"
          required
          className="mt-0.5 size-4 accent-pink-600"
        />
        This supporter has given us permission to recognize them publicly.
      </label>

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
        {pending ? "Adding…" : "Add to wall"}
      </Button>
    </form>
  );
}
