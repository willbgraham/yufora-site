"use client";

import { useTransition } from "react";
import { hideContributionFromWall } from "@/app/actions/wall";

export default function HideFromWallButton({
  contributionId,
  donorLabel,
}: {
  contributionId: string;
  donorLabel: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          confirm(
            `Hide ${donorLabel} from the donor wall? This gift will show as anonymous, permanently.`,
          )
        ) {
          startTransition(() => hideContributionFromWall(contributionId));
        }
      }}
      className="rounded-md px-2 py-1 text-xs font-medium text-warm-600 hover:bg-warm-100 hover:text-pink-700"
    >
      {pending ? "…" : "Hide from wall"}
    </button>
  );
}
