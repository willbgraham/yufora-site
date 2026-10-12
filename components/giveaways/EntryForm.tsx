"use client";

import { useKeepValuesSubmit } from "@/components/forms/useKeepValuesSubmit";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { submitGiveawayEntry, type EntryFormState } from "@/app/actions/giveaway-entry";
import { Button } from "@/components/ui/Button";
import {
  MARKETING_HINT,
  PUBLIC_DISPLAY_OPT_IN,
  RULES_AGREEMENT,
  ageAttestation,
  marketingOptIn,
} from "@/lib/giveaways/legal-copy";
import { HONEYPOT_FIELD } from "@/lib/schema";
import { US_STATES } from "@/lib/us-states";

const initial: EntryFormState = { status: "idle" };

const fieldBase =
  "mt-1.5 w-full rounded-md border border-warm-300 bg-white px-3.5 py-2.5 text-base text-warm-900 placeholder:text-warm-500 focus:border-pink-600";

function scrollParentToUs() {
  if (window.parent !== window) {
    window.parent.postMessage({ type: "yufora:scrollIntoView" }, "*");
  }
}

export default function EntryForm({
  formToken,
  charityName,
  rulesHref,
  disabled = false,
}: {
  formToken: string | null;
  charityName: string;
  rulesHref: string;
  /** Preview and demo: the real form, but it can't submit. */
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(submitGiveawayEntry, initial);
  const keepValues = useKeepValuesSubmit(formAction);
  const [stateCode, setStateCode] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const errs = state.fieldErrors ?? {};
  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;

  useEffect(() => {
    if (state.status === "success") resultRef.current?.focus();
    if (state.status === "error") errorRef.current?.focus();
    if (state.status !== "idle") scrollParentToUs();
  }, [state]);

  if (state.status === "success") {
    return (
      <div
        ref={resultRef}
        tabIndex={-1}
        className="rounded-lg border border-teal-100 bg-teal-50 p-5 outline-none"
      >
        <h3 className="font-display text-2xl text-teal-900">Check your email.</h3>
        <p className="mt-2 text-warm-800">
          We sent a link to <strong className="break-all">{state.email}</strong> — your
          entry counts once you click it.
        </p>
        <p className="mt-2 text-sm text-warm-700">
          Not there? Check spam, or enter again with a different address.
        </p>
      </div>
    );
  }

  const describe = (name: string, hint?: string) =>
    errs[name] ? fid(`${name}-error`) : hint;

  const fieldError = (name: string) =>
    errs[name] ? (
      <p id={fid(`${name}-error`)} className="mt-1.5 text-sm text-pink-700">
        {errs[name]}
      </p>
    ) : null;

  return (
    <form action={formAction} onSubmit={keepValues} className="space-y-4" noValidate>
      <input type="hidden" name="ft" value={formToken ?? ""} />
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={fid("website")}>Website</label>
        <input id={fid("website")} name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {state.status === "error" && state.message && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-md border border-pink-200 bg-pink-50 p-3 text-sm text-pink-800 outline-none"
        >
          {state.message}
        </div>
      )}

      <div className="grid gap-4 @md:grid-cols-2">
        <div>
          <label htmlFor={fid("first")} className="block text-sm font-medium text-warm-900">
            First name
          </label>
          <input
            id={fid("first")}
            name="firstName"
            autoComplete="given-name"
            required
            aria-invalid={!!errs.firstName}
            aria-describedby={describe("firstName")}
            className={fieldBase}
          />
          {fieldError("firstName")}
        </div>
        <div>
          <label htmlFor={fid("last")} className="block text-sm font-medium text-warm-900">
            Last name
          </label>
          <input
            id={fid("last")}
            name="lastName"
            autoComplete="family-name"
            required
            aria-invalid={!!errs.lastName}
            aria-describedby={describe("lastName")}
            className={fieldBase}
          />
          {fieldError("lastName")}
        </div>
      </div>

      <div>
        <label htmlFor={fid("email")} className="block text-sm font-medium text-warm-900">
          Email
        </label>
        <input
          id={fid("email")}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          aria-invalid={!!errs.email}
          aria-describedby={describe("email", fid("email-hint"))}
          className={fieldBase}
        />
        {errs.email ? (
          fieldError("email")
        ) : (
          <p id={fid("email-hint")} className="mt-1.5 text-sm text-warm-600">
            We&rsquo;ll send a link to confirm your entry.
          </p>
        )}
      </div>

      <div>
        <label htmlFor={fid("state")} className="block text-sm font-medium text-warm-900">
          State
        </label>
        <select
          id={fid("state")}
          name="state"
          required
          value={stateCode}
          onChange={(e) => setStateCode(e.target.value)}
          aria-invalid={!!errs.state}
          aria-describedby={describe("state", stateCode === "RI" ? fid("ri") : undefined)}
          className={fieldBase}
        >
          <option value="">Choose your state</option>
          {US_STATES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.code === "RI" ? `${s.name} (not eligible)` : s.name}
            </option>
          ))}
        </select>
        {errs.state ? (
          fieldError("state")
        ) : stateCode === "RI" ? (
          <p id={fid("ri")} className="mt-1.5 text-sm text-pink-700">
            Sorry — Rhode Island residents can&rsquo;t enter this giveaway.
          </p>
        ) : null}
      </div>

      <fieldset className="space-y-3 rounded-lg border border-warm-200 p-4">
        <legend className="px-1 text-sm font-medium text-warm-900">To enter, please confirm</legend>
        <label className="flex min-h-11 items-start gap-3 text-sm text-warm-800">
          <input
            type="checkbox"
            name="ageConfirm"
            required
            aria-invalid={!!errs.ageConfirm}
            className="mt-0.5 size-5 shrink-0 accent-pink-600"
          />
          <span>
            {ageAttestation(stateCode && stateCode !== "RI" ? stateCode : null)}{" "}
            <span className="text-warm-600">(required)</span>
          </span>
        </label>
        {fieldError("ageConfirm")}
        <label className="flex min-h-11 items-start gap-3 text-sm text-warm-800">
          <input
            type="checkbox"
            name="rulesAgree"
            required
            aria-invalid={!!errs.rulesAgree}
            className="mt-0.5 size-5 shrink-0 accent-pink-600"
          />
          <span>
            {RULES_AGREEMENT.replace("Official Rules.", "")}
            <a
              href={rulesHref}
              target="_blank"
              rel="noopener"
              className="font-medium text-pink-700 underline"
            >
              Official Rules
            </a>
            . <span className="text-warm-600">(required)</span>
          </span>
        </label>
        {fieldError("rulesAgree")}
        <label className="flex min-h-11 items-start gap-3 text-sm text-warm-800">
          <input type="checkbox" name="publicDisplay" className="mt-0.5 size-5 shrink-0 accent-pink-600" />
          <span>
            {PUBLIC_DISPLAY_OPT_IN} <span className="text-warm-600">(optional)</span>
          </span>
        </label>
        <label className="flex min-h-11 items-start gap-3 text-sm text-warm-800">
          <input type="checkbox" name="marketing" className="mt-0.5 size-5 shrink-0 accent-pink-600" />
          <span>
            {marketingOptIn(charityName)} <span className="text-warm-600">(optional)</span>
            <span className="mt-0.5 block text-warm-600">{MARKETING_HINT}</span>
          </span>
        </label>
      </fieldset>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={disabled || pending || stateCode === "RI"}
      >
        {pending ? "One moment…" : "Enter free"}
      </Button>
    </form>
  );
}
