"use client";

import { useActionState } from "react";
import type { ProductFormState } from "@/app/actions/products";
import { Button } from "@/components/ui/Button";

const initial: ProductFormState = { status: "idle" };

const fieldBase =
  "mt-1.5 w-full rounded-md border border-warm-300 bg-white px-3.5 py-2.5 text-base text-warm-900 placeholder:text-warm-500 focus:border-pink-600";

type Props = {
  action: (
    prev: ProductFormState,
    formData: FormData,
  ) => Promise<ProductFormState>;
  defaults?: {
    title: string;
    description: string;
    price: string;
    videoUrl: string;
  };
  submitLabel: string;
};

export default function ProductForm({ action, defaults, submitLabel }: Props) {
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
          Item name
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={defaults?.title}
          placeholder="e.g. Laptop for the learning center"
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
        <label htmlFor="price" className="block text-sm font-medium text-warm-900">
          Price (USD)
        </label>
        <div className="relative mt-1.5">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-warm-500"
          >
            $
          </span>
          <input
            id="price"
            name="price"
            required
            inputMode="decimal"
            defaultValue={defaults?.price}
            placeholder="1,200"
            aria-invalid={!!errs.price}
            aria-describedby={errs.price ? "price-error" : "price-hint"}
            className="w-full rounded-md border border-warm-300 bg-white py-2.5 pl-8 pr-3.5 text-base text-warm-900 placeholder:text-warm-500 focus:border-pink-600"
          />
        </div>
        {errs.price ? (
          <p id="price-error" className="mt-1.5 text-sm text-pink-700">
            {errs.price}
          </p>
        ) : (
          <p id="price-hint" className="mt-1.5 text-sm text-warm-600">
            The full cost of the item — donors can fund all of it or chip in.
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-warm-900"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          defaultValue={defaults?.description}
          placeholder="What is it, and what will it make possible?"
          className={fieldBase}
        />
      </div>

      <div>
        <label
          htmlFor="videoUrl"
          className="block text-sm font-medium text-warm-900"
        >
          Video link{" "}
          <span className="font-normal text-warm-500">(optional)</span>
        </label>
        <input
          id="videoUrl"
          name="videoUrl"
          type="url"
          defaultValue={defaults?.videoUrl}
          placeholder="https://youtube.com/watch?v=…"
          aria-invalid={!!errs.videoUrl}
          aria-describedby={errs.videoUrl ? "videoUrl-error" : "videoUrl-hint"}
          className={fieldBase}
        />
        {errs.videoUrl ? (
          <p id="videoUrl-error" className="mt-1.5 text-sm text-pink-700">
            {errs.videoUrl}
          </p>
        ) : (
          <p id="videoUrl-hint" className="mt-1.5 text-sm text-warm-600">
            A YouTube or Vimeo link — it&rsquo;ll play on the item&rsquo;s page.
          </p>
        )}
      </div>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
