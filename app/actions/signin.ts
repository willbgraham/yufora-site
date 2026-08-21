"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { HONEYPOT_FIELD, MIN_FILL_MS } from "@/lib/schema";

export type SignInState = {
  status: "idle" | "sent" | "error";
  email?: string;
};

const emailSchema = z.email().max(160);

/**
 * Magic-link request behind the same anti-bot gates as the lead form.
 * The raw Better Auth HTTP endpoint stays rate-limited (lib/auth.ts) for
 * direct posts; this action is the human path. Bot-shaped submissions
 * get a fake "sent" — telling a bot it failed just invites a retry.
 */
export async function requestMagicLink(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();

  // Honeypot: invisible field no human fills.
  if (formData.get(HONEYPOT_FIELD)) {
    return { status: "sent", email };
  }

  // Timing: faster than a human could type an email address = bot.
  const startedAt = Number(formData.get("startedAt"));
  if (Number.isFinite(startedAt) && Date.now() - startedAt < MIN_FILL_MS) {
    return { status: "sent", email };
  }

  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    return { status: "error" };
  }

  try {
    await auth.api.signInMagicLink({
      body: { email: parsed.data, callbackURL: "/admin" },
      headers: await headers(),
    });
  } catch (err) {
    console.error("[signin] magic link send failed", err);
    return { status: "error" };
  }

  return { status: "sent", email: parsed.data };
}
