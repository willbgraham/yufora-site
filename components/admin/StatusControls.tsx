"use client";

import { useTransition } from "react";
import { setProductStatus } from "@/app/actions/products";
import type { ProductStatus } from "@/lib/db/schema";
import { Button } from "@/components/ui/Button";

export default function StatusControls({
  productId,
  status,
}: {
  productId: string;
  status: ProductStatus;
}) {
  const [pending, startTransition] = useTransition();

  const set = (next: ProductStatus) =>
    startTransition(() => setProductStatus(productId, next));

  return (
    <div className="flex flex-wrap items-center gap-3">
      {status === "draft" && (
        <>
          <span className="rounded-full bg-warm-100 px-2.5 py-0.5 text-xs font-medium text-warm-600">
            Draft — not visible to donors
          </span>
          <Button type="button" disabled={pending} onClick={() => set("published")}>
            {pending ? "Working…" : "Publish"}
          </Button>
        </>
      )}
      {status === "published" && (
        <>
          <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-700">
            Published — live on your shop
          </span>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => set("draft")}
          >
            {pending ? "Working…" : "Unpublish"}
          </Button>
        </>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (
            confirm(
              "Archive this item? It disappears from your shop and this list. Its contribution history is kept.",
            )
          ) {
            set("archived");
          }
        }}
        className="rounded-md px-3 py-2 text-sm text-warm-600 hover:bg-warm-100 hover:text-pink-700"
      >
        Archive
      </button>
    </div>
  );
}
