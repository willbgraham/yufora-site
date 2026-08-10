"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitLead, type LeadState } from "@/app/actions/lead";
import {
  ROLES,
  INTERESTS,
  BUDGETS,
  HONEYPOT_FIELD,
} from "@/lib/schema";
import { Button } from "@/components/ui/Button";

const initial: LeadState = { status: "idle" };

const fieldBase =
  "w-full rounded-md border border-warm-300 bg-white px-3.5 py-2.5 text-base text-warm-900 placeholder:text-warm-500 focus:border-pink-600";

function Label({
  htmlFor,
  children,
  optional,
}: {
  htmlFor: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-warm-900">
      {children}
      {optional && <span className="ml-1 font-normal text-warm-500">(optional)</span>}
    </label>
  );
}

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={id} className="mt-1.5 text-sm text-pink-700">
      {errors[0]}
    </p>
  );
}

export default function LeadForm() {
  const [state, formAction, pending] = useActionState(submitLead, initial);
  const [startedAt] = useState(() => Date.now());
  const successRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // Move focus on state change so screen-reader users are told what happened
  // rather than landing on a silently changed page.
  useEffect(() => {
    if (state.status === "success") successRef.current?.focus();
    if (state.status === "error") errorRef.current?.focus();
  }, [state.status]);

  if (state.status === "success") {
    return (
      <div className="rounded-lg border border-teal-100 bg-teal-50 p-8">
        <h3
          ref={successRef}
          tabIndex={-1}
          className="font-display text-2xl text-teal-900 outline-none"
        >
          Got it — we&rsquo;re on it.
        </h3>
        <p className="mt-3 text-warm-700">
          We read every one of these ourselves. A real person will get back to
          you within two business days — not an automated sequence.
        </p>
      </div>
    );
  }

  const errs = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="startedAt" value={startedAt} />

      {/* Honeypot. Not type="hidden" — bots skip those. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={HONEYPOT_FIELD}>Website</label>
        <input
          id={HONEYPOT_FIELD}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {state.status === "error" && state.message && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-md border border-pink-200 bg-pink-50 p-4 text-sm text-pink-800 outline-none"
        >
          {state.message}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="orgName">Organization name</Label>
          <input
            id="orgName"
            name="orgName"
            required
            autoComplete="organization"
            aria-invalid={!!errs.orgName}
            aria-describedby={errs.orgName ? "orgName-error" : undefined}
            className={`mt-1.5 ${fieldBase}`}
          />
          <FieldError id="orgName-error" errors={errs.orgName} />
        </div>

        <div>
          <Label htmlFor="contactName">Your name</Label>
          <input
            id="contactName"
            name="contactName"
            required
            autoComplete="name"
            aria-invalid={!!errs.contactName}
            aria-describedby={errs.contactName ? "contactName-error" : undefined}
            className={`mt-1.5 ${fieldBase}`}
          />
          <FieldError id="contactName-error" errors={errs.contactName} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="email">Email</Label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            required
            autoComplete="email"
            aria-invalid={!!errs.email}
            aria-describedby={errs.email ? "email-error" : undefined}
            className={`mt-1.5 ${fieldBase}`}
          />
          <FieldError id="email-error" errors={errs.email} />
        </div>

        <div>
          <Label htmlFor="role">Your role</Label>
          <select
            id="role"
            name="role"
            required
            defaultValue=""
            aria-invalid={!!errs.role}
            aria-describedby={errs.role ? "role-error" : undefined}
            className={`mt-1.5 ${fieldBase}`}
          >
            <option value="" disabled>
              Choose one…
            </option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <FieldError id="role-error" errors={errs.role} />
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-warm-900">
          What are you most interested in?
        </legend>
        <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
          {INTERESTS.map((i) => (
            <label
              key={i.value}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-warm-200 bg-white px-3.5 py-2.5 hover:bg-warm-50"
            >
              <input
                type="checkbox"
                name="interests"
                value={i.value}
                className="size-4 accent-pink-600"
              />
              <span className="text-base text-warm-800">{i.label}</span>
            </label>
          ))}
        </div>
        <FieldError id="interests-error" errors={errs.interests} />
      </fieldset>

      <div>
        <Label htmlFor="budget" optional>
          Annual fundraising budget
        </Label>
        <select
          id="budget"
          name="budget"
          defaultValue=""
          className={`mt-1.5 ${fieldBase}`}
        >
          <option value="">Prefer not to say</option>
          {BUDGETS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="message" optional>
          Anything you&rsquo;re planning this year?
        </Label>
        <textarea
          id="message"
          name="message"
          rows={3}
          className={`mt-1.5 ${fieldBase}`}
        />
      </div>

      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Sending…" : "Get started"}
      </Button>

      <p className="text-sm text-warm-600">
        We&rsquo;ll only use this to get back to you. No newsletter, no sharing
        your details with anyone.
      </p>
    </form>
  );
}
