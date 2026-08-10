"use server";

import { deliverLead } from "@/lib/email";
import {
  leadSchema,
  HONEYPOT_FIELD,
  MIN_FILL_MS,
  type Lead,
} from "@/lib/schema";

export type LeadState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function submitLead(
  _prev: LeadState,
  formData: FormData,
): Promise<LeadState> {
  // --- anti-spam -----------------------------------------------------------
  // Honeypot: a real user never fills this in (it's visually hidden and
  // removed from the tab order).
  if (formData.get(HONEYPOT_FIELD)) {
    // Pretend it worked — telling a bot it failed just invites a retry.
    return { status: "success" };
  }

  // Timing: submissions faster than a human could fill the form are bots.
  const startedAt = Number(formData.get("startedAt"));
  if (Number.isFinite(startedAt) && Date.now() - startedAt < MIN_FILL_MS) {
    return { status: "success" };
  }

  // --- validation ----------------------------------------------------------
  // Server-side validation is authoritative: a Server Action is a public
  // endpoint and anyone can POST to it.
  const parsed = leadSchema.safeParse({
    orgName: formData.get("orgName"),
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    role: formData.get("role"),
    interests: formData.getAll("interests"),
    budget: formData.get("budget") || undefined,
    message: formData.get("message") || undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const result = await deliverLead(parsed.data as Lead);

  if (!result.ok) {
    return {
      status: "error",
      message:
        "Something went wrong on our end. Please email hello@yufora.com and we'll pick it up from there.",
    };
  }

  return { status: "success" };
}
