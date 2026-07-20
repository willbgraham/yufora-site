"use client";

import { useActionState } from "react";
import {
  createCharity,
  type CharityFormState,
} from "@/app/actions/charity";
import { Button } from "@/components/ui/Button";

const initial: CharityFormState = { status: "idle" };

export default function CreateCharityForm() {
  const [state, formAction, pending] = useActionState(createCharity, initial);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-warm-900"
        >
          Organization name
        </label>
        <input
          id="name"
          name="name"
          required
          autoComplete="organization"
          placeholder="e.g. Riverside Animal Rescue"
          className="mt-1.5 w-full rounded-md border border-warm-300 bg-white px-3.5 py-2.5 text-base text-warm-900 placeholder:text-warm-500 focus:border-pink-600"
        />
        <p className="mt-1.5 text-sm text-warm-600">
          This is the name your donors will see. You can change it later.
        </p>
      </div>

      {state.status === "error" && state.message && (
        <p role="alert" className="text-sm text-pink-700">
          {state.message}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Creating…" : "Create your shop"}
      </Button>
    </form>
  );
}
