"use client";

import Image from "next/image";
import { useActionState, useRef, useTransition } from "react";
import {
  removePrizePhoto,
  uploadPrizePhoto,
  type GiveawayFormState,
} from "@/app/actions/giveaways";

const initial: GiveawayFormState = { status: "idle" };

export default function PrizePhotoField({
  campaignId,
  photoUrl,
  prizeName,
}: {
  campaignId: string;
  photoUrl: string | null;
  prizeName: string;
}) {
  const [state, formAction, pending] = useActionState(uploadPrizePhoto.bind(null, campaignId), initial);
  const [removing, startRemove] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-wrap items-start gap-5">
      <div className="relative aspect-[4/3] w-48 overflow-hidden rounded-md border border-warm-200 bg-warm-100">
        {photoUrl ? (
          <Image src={photoUrl} alt={prizeName} fill sizes="192px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-warm-500">No photo yet</div>
        )}
      </div>
      <div className="space-y-2">
        <form ref={formRef} action={formAction}>
          <label className={`inline-flex min-h-11 cursor-pointer items-center rounded-md px-4 text-sm font-medium text-warm-900 ring-1 ring-warm-300 hover:bg-warm-50 ${pending ? "pointer-events-none opacity-60" : ""}`}>
            {pending ? "Uploading…" : photoUrl ? "Replace photo" : "Add a photo"}
            <input
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={() => formRef.current?.requestSubmit()}
            />
          </label>
        </form>
        {photoUrl && (
          <button
            type="button"
            disabled={removing}
            onClick={() => startRemove(() => removePrizePhoto(campaignId))}
            className="text-sm text-warm-600 hover:text-pink-700"
          >
            Remove photo
          </button>
        )}
        <p className="max-w-xs text-sm text-warm-600">
          One photo of the actual prize. It&rsquo;s also the image when the giveaway is shared.
        </p>
        {state.status === "error" && state.message && (
          <p role="alert" className="text-sm text-pink-700">{state.message}</p>
        )}
      </div>
    </div>
  );
}
