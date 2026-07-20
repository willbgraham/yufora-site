"use client";

import { useState } from "react";
import Section from "@/components/layout/Section";
import { Button } from "@/components/ui/Button";
import { authClient } from "@/lib/auth-client";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const { error } = await authClient.signIn.magicLink({
      email,
      callbackURL: "/admin",
    });
    setStatus(error ? "error" : "sent");
  }

  return (
    <Section>
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl sm:text-4xl">Sign in</h1>

        {status === "sent" ? (
          <div className="mt-8 rounded-lg border border-teal-100 bg-teal-50 p-6">
            <p className="font-medium text-teal-900">Check your email.</p>
            <p className="mt-2 text-warm-700">
              We sent a sign-in link to <strong>{email}</strong>. It expires
              shortly and can only be used once.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-3 text-warm-700">
              No password needed — we&rsquo;ll email you a one-time sign-in
              link.
            </p>
            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-warm-900"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-warm-300 bg-white px-3.5 py-2.5 text-base text-warm-900 focus:border-pink-600"
                />
              </div>
              {status === "error" && (
                <p role="alert" className="text-sm text-pink-700">
                  Couldn&rsquo;t send the link. Please try again, or email
                  hello@yufora.com.
                </p>
              )}
              <Button
                type="submit"
                size="lg"
                disabled={status === "sending"}
                className="w-full"
              >
                {status === "sending" ? "Sending…" : "Email me a sign-in link"}
              </Button>
            </form>
          </>
        )}
      </div>
    </Section>
  );
}
