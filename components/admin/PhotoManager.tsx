"use client";

import Image from "next/image";
import { useActionState, useRef } from "react";
import {
  addProductPhotos,
  deleteProductPhoto,
  type PhotoFormState,
} from "@/app/actions/products";

const initial: PhotoFormState = { status: "idle" };

type Photo = { id: string; url: string };

export default function PhotoManager({
  productId,
  photos,
  maxPhotos,
}: {
  productId: string;
  photos: Photo[];
  maxPhotos: number;
}) {
  const boundAdd = addProductPhotos.bind(null, productId);
  const [state, formAction, pending] = useActionState(boundAdd, initial);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const atLimit = photos.length >= maxPhotos;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {photos.map((photo, i) => (
          <div
            key={photo.id}
            className="group relative aspect-[4/3] overflow-hidden rounded-md border border-warm-200 bg-warm-100"
          >
            <Image
              src={photo.url}
              alt={`Product photo ${i + 1}`}
              fill
              sizes="(min-width: 640px) 200px, 45vw"
              className="object-cover"
            />
            {i === 0 && (
              <span className="absolute left-1.5 top-1.5 rounded-sm bg-white/90 px-1.5 py-0.5 text-xs font-medium text-warm-700">
                Cover
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                if (confirm("Remove this photo?")) {
                  void deleteProductPhoto(photo.id);
                }
              }}
              aria-label={`Remove photo ${i + 1}`}
              className="absolute right-1.5 top-1.5 rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-pink-700 opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
            >
              Remove
            </button>
          </div>
        ))}

        {!atLimit && (
          <form ref={formRef} action={formAction}>
            <label
              className={`flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-warm-300 text-center text-sm text-warm-600 transition-colors hover:border-pink-400 hover:text-pink-700 ${pending ? "pointer-events-none opacity-60" : ""}`}
            >
              <span aria-hidden="true" className="text-2xl leading-none">
                +
              </span>
              {pending ? "Uploading…" : "Add photos"}
              <input
                ref={fileRef}
                type="file"
                name="photos"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="sr-only"
                onChange={() => formRef.current?.requestSubmit()}
              />
            </label>
          </form>
        )}
      </div>

      {state.status === "error" && state.message && (
        <p role="alert" className="mt-3 text-sm text-pink-700">
          {state.message}
        </p>
      )}
      <p className="mt-3 text-sm text-warm-600">
        Up to {maxPhotos} photos, 8MB each. The first photo is the cover your
        donors see.
      </p>
    </div>
  );
}
