"use client";

import { useActionState } from "react";
import type { TokenActionState } from "@/app/actions/giveaway-entry";
import { Button } from "@/components/ui/Button";

const initial: TokenActionState = { status: "idle" };

/**
 * A single button that posts the personal link's token. Email links open a
 * PAGE with this button rather than acting on load: email security
 * scanners follow links, and would otherwise confirm entries nobody made.
 */
export default function TokenButton({
  action,
  token,
  path,
  label,
  pendingLabel = "One moment…",
  disabled = false,
}: {
  action: (prev: TokenActionState, fd: FormData) => Promise<TokenActionState>;
  token: string;
  path: string;
  label: string;
  pendingLabel?: string;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form action={formAction}>
      <input type="hidden" name="t" value={token} />
      <input type="hidden" name="path" value={path} />
      <Button type="submit" size="lg" className="w-full" disabled={disabled || pending}>
        {pending ? pendingLabel : label}
      </Button>
      {state.message && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`mt-2 text-sm ${state.status === "error" ? "text-pink-700" : "text-teal-700"}`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
