"use client";

import { useActionState, useState } from "react";
import Section from "@/components/layout/Section";
import { Button } from "@/components/ui/Button";
import { requestMagicLink, type SignInState } from "@/app/actions/signin";
import { HONEYPOT_FIELD } from "@/lib/schema";

const initial: SignInState = { status: "idle" };

export default function SignInPage() {
  const [state, formAction, pending] = useActionState(requestMagicLink, initial);
  const [startedAt] = useState(() => Date.now());

  return (
    <Section>
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl sm:text-4xl">Sign in</h1>

        {state.status === "sent" ? (
          <div className="mt-8 rounded-lg border border-teal-100 bg-teal-50 p-6">
            <p className="font-medium text-teal-900">Check your email.</p>
            <p className="mt-2 text-warm-700">
              We sent a sign-in link to <strong>{state.email}</strong>. It
              expires shortly and can only be used once.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-3 text-warm-700">
              Enter your email and we&rsquo;ll send you a one-time link. It
              signs you in — or creates your account if you&rsquo;re new. No
              password either way.
            </p>
            <form action={formAction} className="mt-8 space-y-4" noValidate>
              <input type="hidden" name="startedAt" value={startedAt} />

              {/* Honeypot. Not type="hidden" — bots skip those. */}
              <div
                aria-hidden="true"
                className="absolute left-[-9999px] h-0 w-0 overflow-hidden"
              >
                <label htmlFor={`signin-${HONEYPOT_FIELD}`}>Website</label>
                <input
                  id={`signin-${HONEYPOT_FIELD}`}
                  name={HONEYPOT_FIELD}
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-warm-900"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  className="mt-1.5 w-full rounded-md border border-warm-300 bg-white px-3.5 py-2.5 text-base text-warm-900 focus:border-pink-600"
                />
              </div>
              {state.status === "error" && (
                <p role="alert" className="text-sm text-pink-700">
                  Couldn&rsquo;t send the link. Please check the address and
                  try again, or email hello@yufora.com.
                </p>
              )}
              <Button
                type="submit"
                size="lg"
                disabled={pending}
                className="w-full"
              >
                {pending ? "Sending…" : "Email me a sign-in link"}
              </Button>
            </form>
          </>
        )}
      </div>
    </Section>
  );
}
