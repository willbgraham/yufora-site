"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  claimDailyEntry,
  confirmEntrant,
  respondToClaim,
  submitEntry,
  type RequestCtx,
} from "@/lib/giveaways/service";
import { readEntryForm } from "@/lib/giveaways/validation";
import { HONEYPOT_FIELD } from "@/lib/schema";
import { clientIp } from "@/lib/throttle";

/**
 * Public giveaway actions — unauthenticated endpoints, so everything is
 * re-validated server-side: the signed form/entrant/claim token decides
 * which giveaway and which person, never a form field.
 */

async function requestCtx(): Promise<RequestCtx> {
  const h = await headers();
  return { now: new Date(), ip: clientIp(h), ipCountry: h.get("x-vercel-ip-country") };
}

export type EntryFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  email?: string;
  fieldErrors?: Record<string, string>;
};

export async function submitGiveawayEntry(
  _prev: EntryFormState,
  fd: FormData,
): Promise<EntryFormState> {
  const result = await submitEntry({
    formToken: typeof fd.get("ft") === "string" ? String(fd.get("ft")) : null,
    raw: readEntryForm(fd),
    honeypotFilled: Boolean(fd.get(HONEYPOT_FIELD)),
    ctx: await requestCtx(),
  });
  if (result.status === "success") return { status: "success", email: result.email };
  return {
    status: "error",
    message: result.message,
    fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
  };
}

export type TokenActionState = {
  status: "idle" | "done" | "error";
  message?: string;
};

function refreshEntrantPage(fd: FormData) {
  const path = fd.get("path");
  if (typeof path === "string" && /^\/s\/[\w-]+\/giveaways\/[\w-]+\/(entry|claim)$/.test(path)) {
    revalidatePath(path);
  }
}

export async function confirmGiveawayEntry(
  _prev: TokenActionState,
  fd: FormData,
): Promise<TokenActionState> {
  const r = await confirmEntrant({ token: String(fd.get("t") ?? ""), ctx: await requestCtx() });
  refreshEntrantPage(fd);
  switch (r.status) {
    case "confirmed":
    case "already":
      return { status: "done" };
    case "late":
      return {
        status: "error",
        message: "Thanks — but confirmations closed 24 hours after entries did, so this entry can't count.",
      };
    case "rate_limited":
      return { status: "error", message: "Too many tries from this connection. Please try again later." };
    case "closed":
      return { status: "error", message: "This giveaway isn't running anymore." };
    case "invalid":
      return { status: "error", message: "This link doesn't work anymore." };
  }
}

export async function claimGiveawayDailyEntry(
  _prev: TokenActionState,
  fd: FormData,
): Promise<TokenActionState> {
  const r = await claimDailyEntry({ token: String(fd.get("t") ?? ""), ctx: await requestCtx() });
  refreshEntrantPage(fd);
  switch (r.status) {
    case "added":
      return { status: "done", message: r.inserted === 1 ? "Today's free entry is in." : `${r.inserted} free entries added.` };
    case "already_today":
      return { status: "done", message: "Today's free entry is already in." };
    case "cap":
      return { status: "done", message: "You've reached the entry limit. Thanks for playing!" };
    case "closed":
      return { status: "error", message: "Entries are closed." };
    case "unconfirmed":
      return { status: "error", message: "Confirm your entry first." };
    case "rate_limited":
      return { status: "error", message: "Too many tries from this connection. Please try again later." };
    default:
      return { status: "error", message: "This link doesn't work anymore." };
  }
}

export async function respondToGiveawayClaim(
  _prev: TokenActionState,
  fd: FormData,
): Promise<TokenActionState> {
  const decision = fd.get("decision") === "decline" ? "decline" : "accept";
  const r = await respondToClaim({
    token: String(fd.get("t") ?? ""),
    decision,
    typedEmail: String(fd.get("email") ?? ""),
    legalName: String(fd.get("legalName") ?? ""),
    phone: String(fd.get("phone") ?? ""),
    attested: fd.get("attest") === "on",
    ctx: await requestCtx(),
  });
  refreshEntrantPage(fd);
  if (r.status === "error") return { status: "error", message: r.message };
  return { status: "done" };
}
