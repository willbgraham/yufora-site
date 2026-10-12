"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getEntitlementsForCharity } from "@/lib/billing";
import { getSponsorDefaults } from "@/lib/data/giveaways";
import { localIsoDate } from "@/lib/giveaways/calendar";
import {
  MAX_ENTRY_DAYS,
  PER_PERSON_CAP_MAX,
  isGiveawayTimezone,
} from "@/lib/giveaways/constants";
import { lockAndDraw, type DrawOutcome } from "@/lib/giveaways/draw";
import { requireGiveawayAdmin } from "@/lib/giveaways/admin-access";
import { isGiveawaysGoLiveOpen } from "@/lib/giveaways/flags";
import {
  cancelGiveaway,
  createDraft,
  deleteDraft,
  goLive,
  markPrizeAwarded,
  promoteNextAlternate,
  resendClaimEmail,
  setPrizePhoto,
  updateDraft,
  type PassReason,
} from "@/lib/giveaways/service";
import { parseGiveawayDraft, readDraftForm, type GoLiveCheck } from "@/lib/giveaways/validation";
import { siteConfig } from "@/lib/site";
import { deletePhotoBlob, photoValidationError, savePhoto } from "@/lib/storage";
import { isStripeConfigured } from "@/lib/stripe";

export type GiveawayFormState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

/** Every write below is also scoped by charity_id in its WHERE. */
const requireGiveawayCharity = requireGiveawayAdmin;

function refresh(id?: string) {
  revalidatePath("/admin/giveaways");
  if (id) revalidatePath(`/admin/giveaways/${id}`);
}

export async function createGiveaway(
  _prev: GiveawayFormState,
  fd: FormData,
): Promise<GiveawayFormState> {
  const { charity } = await requireGiveawayCharity();
  const now = new Date();
  const timezone = String(fd.get("timezone") ?? "");
  const endDate = String(fd.get("endDate") ?? "");
  const startDate = localIsoDate(
    now,
    isGiveawayTimezone(timezone) ? timezone : "America/New_York",
  );
  // A sensible starting limit: one free entry a day, cap = the number of
  // days, so parity holds out of the box.
  const days =
    /^\d{4}-\d{2}-\d{2}$/.test(endDate) && endDate >= startDate
      ? Math.round((Date.parse(endDate) - Date.parse(startDate)) / 86_400_000) + 1
      : 30;
  const sponsor = await getSponsorDefaults(charity.id);
  const parsed = parseGiveawayDraft(
    {
      prizeName: fd.get("prizeName"),
      prizeDescription: "",
      prizeArv: fd.get("prizeArv"),
      startDate,
      endDate,
      timezone,
      freeEntriesPerDay: "1",
      perPersonCap: String(Math.min(PER_PERSON_CAP_MAX, Math.max(1, Math.min(days, MAX_ENTRY_DAYS)))),
      donationsEnabled: false,
      dollarsPerEntry: "",
      claimDeadlineDays: "7",
      sponsorLegalName: sponsor?.sponsorLegalName ?? charity.name,
      sponsorStreet: sponsor?.sponsorStreet ?? "",
      sponsorCity: sponsor?.sponsorCity ?? "",
      sponsorState: sponsor?.sponsorState ?? "",
      sponsorZip: sponsor?.sponsorZip ?? "",
      sponsorPrivacyUrl: sponsor?.sponsorPrivacyUrl ?? "",
      sitePageUrl: charity.embedPageUrl ?? "",
      excludedEmailDomains: sponsor?.excludedEmailDomains ?? "",
    },
    now,
  );
  if (!parsed.ok) {
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors: parsed.fieldErrors };
  }
  const { id } = await createDraft({ charityId: charity.id, values: parsed.values });
  refresh();
  redirect(`/admin/giveaways/${id}`);
}

export async function updateGiveaway(
  campaignId: string,
  _prev: GiveawayFormState,
  fd: FormData,
): Promise<GiveawayFormState> {
  const { charity } = await requireGiveawayCharity();
  const parsed = parseGiveawayDraft(readDraftForm(fd), new Date());
  if (!parsed.ok) {
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors: parsed.fieldErrors };
  }
  const result = await updateDraft({ charityId: charity.id, campaignId, values: parsed.values });
  if (result === "locked") {
    return { status: "error", message: "This giveaway is live, so its terms are locked." };
  }
  refresh(campaignId);
  return { status: "idle", message: "Saved." };
}

export async function deleteGiveaway(campaignId: string): Promise<void> {
  const { charity } = await requireGiveawayCharity();
  const { deleted, photoUrl } = await deleteDraft({ charityId: charity.id, campaignId });
  if (deleted && photoUrl) await deletePhotoBlob(photoUrl);
  refresh();
  redirect("/admin/giveaways");
}

export async function uploadPrizePhoto(
  campaignId: string,
  _prev: GiveawayFormState,
  fd: FormData,
): Promise<GiveawayFormState> {
  const { charity } = await requireGiveawayCharity();
  const file = fd.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a photo to upload." };
  }
  const problem = photoValidationError(file);
  if (problem) return { status: "error", message: problem };
  const url = await savePhoto(file, campaignId, "giveaways");
  const result = await setPrizePhoto({ charityId: charity.id, campaignId, url });
  if (!result) {
    await deletePhotoBlob(url);
    return { status: "error", message: "This giveaway is live, so its photo is locked." };
  }
  if (result.previous) await deletePhotoBlob(result.previous);
  refresh(campaignId);
  return { status: "idle" };
}

export async function removePrizePhoto(campaignId: string): Promise<void> {
  const { charity } = await requireGiveawayCharity();
  const result = await setPrizePhoto({ charityId: charity.id, campaignId, url: null });
  if (result?.previous) await deletePhotoBlob(result.previous);
  refresh(campaignId);
}

export type GoLiveState = {
  status: "idle" | "error";
  message?: string;
  checks?: GoLiveCheck[];
};

export async function goLiveGiveaway(
  campaignId: string,
  _prev: GoLiveState,
  fd: FormData,
): Promise<GoLiveState> {
  const { session, charity } = await requireGiveawayCharity();
  const goLiveOpen = isGiveawaysGoLiveOpen();
  if (!goLiveOpen) {
    return { status: "error", message: "Going live opens after our legal review of the Official Rules." };
  }
  const entitlements = await getEntitlementsForCharity(charity);
  if (!entitlements.giveaways) redirect("/admin/billing?need=giveaways");

  const result = await goLive({
    charityId: charity.id,
    campaignId,
    userId: session.user.id,
    attested: fd.get("sponsorAttest") === "on",
    now: new Date(),
    origin: siteConfig.url,
    entitled: true,
    goLiveOpen,
    stripeConfigured: isStripeConfigured(),
  });
  refresh(campaignId);
  if (result.status === "live") return { status: "idle" };
  return {
    status: "error",
    message: result.message,
    checks: result.code === "checks" ? result.checks : undefined,
  };
}

export async function cancelGiveawayAction(
  campaignId: string,
  _prev: GiveawayFormState,
  fd: FormData,
): Promise<GiveawayFormState> {
  const { charity } = await requireGiveawayCharity();
  const reason = String(fd.get("reason") ?? "").trim();
  if (reason.length < 3) return { status: "error", message: "Please say briefly why." };
  const r = await cancelGiveaway({ charityId: charity.id, campaignId, reason, now: new Date() });
  refresh(campaignId);
  if (r === "not_allowed") {
    return {
      status: "error",
      message: "People have already entered, so canceling now is a Rules question. Email hello@yufora.com and we'll help.",
    };
  }
  return { status: "idle", message: "Canceled." };
}

export type DrawActionState = {
  status: "idle" | "drawn" | "waiting" | "error" | "no_entries";
  message?: string;
};

function drawState(out: DrawOutcome): DrawActionState {
  switch (out.status) {
    case "drawn":
      return { status: "drawn" };
    case "waiting":
      return {
        status: "waiting",
        message: `Waiting for drand round ${out.targetRound}. This page will update on its own.`,
      };
    case "no_entries":
      return { status: "no_entries", message: "No one confirmed an entry, so there's no winner to draw." };
    case "error":
      return { status: "error", message: out.message };
    case "locked":
    case "already_locked":
      return { status: "waiting", message: "Entries are locked. Waiting for the public random number…" };
  }
}

export async function drawGiveaway(
  campaignId: string,
  _prev: DrawActionState,
  fd: FormData,
): Promise<DrawActionState> {
  const { session, charity } = await requireGiveawayCharity();
  if (fd.get("confirmFinal") !== "on") {
    return { status: "error", message: "Please confirm you understand the draw is final." };
  }
  const out = await lockAndDraw({
    campaignId,
    charityId: charity.id,
    userId: session.user.id,
    now: new Date(),
    waitBudgetMs: 40_000,
  });
  refresh(campaignId);
  return drawState(out);
}

const PASS_REASONS: PassReason[] = ["expired", "declined", "ineligible", "unverified"];

export async function passToAlternate(
  campaignId: string,
  _prev: GiveawayFormState,
  fd: FormData,
): Promise<GiveawayFormState> {
  const { charity } = await requireGiveawayCharity();
  const reason = String(fd.get("reason") ?? "") as PassReason;
  if (!PASS_REASONS.includes(reason)) return { status: "error", message: "Choose a reason." };
  const r = await promoteNextAlternate({ charityId: charity.id, campaignId, reason, now: new Date() });
  refresh(campaignId);
  if (r.status === "error") return { status: "error", message: r.message };
  return {
    status: "idle",
    message:
      r.status === "exhausted"
        ? "No alternates are left, so the prize goes unclaimed."
        : `Alternate #${r.rank} has been emailed.`,
  };
}

export async function markDelivered(campaignId: string): Promise<void> {
  const { charity } = await requireGiveawayCharity();
  await markPrizeAwarded({ charityId: charity.id, campaignId, now: new Date() });
  refresh(campaignId);
}

export async function resendWinnerEmail(campaignId: string): Promise<void> {
  const { charity } = await requireGiveawayCharity();
  await resendClaimEmail({ charityId: charity.id, campaignId, now: new Date() });
  refresh(campaignId);
}
