import "server-only";
import { inlinePrize, money } from "./format";

/**
 * Giveaway emails, sent by Yufora (the Administrator) on the charity's
 * behalf. Same contract as lib/donor-email.ts: plain text, Resend loaded
 * lazily, and NEVER throws — the entry or draw is already committed, and a
 * failed email must not undo it. Without RESEND_API_KEY every email is
 * logged in full (links included), so local testing works like magic links.
 *
 * Entrant emails set reply-to to the charity owner, so replies reach the
 * Sponsor directly.
 */

type Message = {
  to: string | string[];
  subject: string;
  text: string;
  replyTo?: string | null;
  /** Shown as "{charity} via Yufora" when the from address allows it. */
  onBehalfOf?: string;
};

function sanitizeName(name: string): string {
  return name.replace(/["<>\r\n]/g, "").trim().slice(0, 80);
}

function fromAddress(onBehalfOf?: string): string | null {
  const raw =
    process.env.GIVEAWAYS_EMAIL_FROM ??
    process.env.DONOR_EMAIL_FROM ??
    process.env.LEAD_NOTIFY_FROM ??
    null;
  if (!raw || !onBehalfOf) return raw;
  const match = raw.match(/<([^>]+)>/);
  const address = match ? match[1] : raw.trim();
  return `"${sanitizeName(onBehalfOf)} via Yufora" <${address}>`;
}

function compact(lines: (string | false | null | undefined)[]): string {
  return lines
    .filter((l): l is string => typeof l === "string")
    .filter((line, i, arr) => line !== "" || arr[i - 1] !== "")
    .join("\n")
    .trim();
}

async function send(msg: Message): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = fromAddress(msg.onBehalfOf);
  try {
    if (!apiKey || !from) {
      console.info(
        `[giveaway-email] not configured — would have sent to ${String(msg.to)}:\nSubject: ${msg.subject}\n${msg.text}`,
      );
      return false;
    }
    const { Resend } = await import("resend");
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to: msg.to,
      replyTo: msg.replyTo ?? undefined,
      subject: msg.subject,
      text: msg.text,
    });
    if (error) {
      console.error("[giveaway-email] send failed", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[giveaway-email] send threw", err);
    return false;
  }
}

type EntrantBase = {
  to: string;
  firstName: string;
  charityName: string;
  charityReplyTo: string | null;
  prizeName: string;
};

function signoff(b: { charityName: string; charityReplyTo: string | null }) {
  return [
    "",
    `— Yufora, on behalf of ${b.charityName}`,
    b.charityReplyTo
      ? `(Reply to this email to reach ${b.charityName} directly.)`
      : null,
  ];
}

/** E1 — double opt-in. The link opens a page with a Confirm button. */
export function sendEntryConfirmation(
  m: EntrantBase & { entryUrl: string; endsLabel: string; rulesUrl: string },
) {
  return send({
    to: m.to,
    replyTo: m.charityReplyTo,
    onBehalfOf: m.charityName,
    subject: `Confirm your entry: ${m.prizeName}`,
    text: compact([
      `Hi ${m.firstName} —`,
      "",
      `Thanks for entering ${m.charityName}'s giveaway for ${inlinePrize(m.prizeName)}.`,
      "",
      "Confirm your entry here, and it counts:",
      m.entryUrl,
      "",
      `Keep this email. The same link is how you come back for a free entry each day until entries close ${m.endsLabel}.`,
      "",
      "If you didn't enter, ignore this — nothing happens unless you click.",
      "",
      `Official Rules: ${m.rulesUrl}`,
      ...signoff(m),
    ]),
  });
}

/** E2 — an address that already entered submitted the form again. */
export function sendEntryLinkAgain(
  m: EntrantBase & { entryUrl: string; endsLabel: string; confirmed: boolean },
) {
  return send({
    to: m.to,
    replyTo: m.charityReplyTo,
    onBehalfOf: m.charityName,
    subject: `Your entry link: ${m.prizeName}`,
    text: compact([
      `Hi ${m.firstName} —`,
      "",
      `You're already entered in ${m.charityName}'s giveaway for ${inlinePrize(m.prizeName)}, so here's your link again:`,
      m.entryUrl,
      "",
      m.confirmed
        ? `Use it once a day for a free entry until entries close ${m.endsLabel}.`
        : "Your entry isn't confirmed yet — open the link and click Confirm.",
      ...signoff(m),
    ]),
  });
}

/** E3 — bonus entries credited from a donation. */
export function sendBonusEntriesThanks(
  m: EntrantBase & {
    amountCents: number;
    credited: number;
    total: number;
    cap: number;
    entryUrl: string;
    note: string | null;
  },
) {
  const added =
    m.credited > 0
      ? `Your ${money(m.amountCents)} gift to ${m.charityName} added ${m.credited} bonus ${m.credited === 1 ? "entry" : "entries"} to the ${m.prizeName} giveaway. You now have ${m.total} of ${m.cap} possible entries.`
      : `Thank you for your ${money(m.amountCents)} gift to ${m.charityName}.`;
  const why =
    m.note === "cap_reached"
      ? m.credited > 0
        ? `That brought you to the ${m.cap}-entry limit, so the rest of your gift is simply a gift — thank you for it.`
        : `You'd already reached the ${m.cap}-entry limit, so this gift didn't add entries — it's simply a gift, and thank you for it.`
      : m.note
        ? "Entries had already closed when your gift arrived, so it didn't add entries — it's simply a gift, and thank you for it."
        : null;
  return send({
    to: m.to,
    replyTo: m.charityReplyTo,
    onBehalfOf: m.charityName,
    subject:
      m.credited > 0
        ? `Thank you — ${m.credited} bonus ${m.credited === 1 ? "entry" : "entries"} added`
        : `Thank you for your gift to ${m.charityName}`,
    text: compact([
      `Hi ${m.firstName} —`,
      "",
      added,
      why,
      "",
      `Your payment receipt comes separately from Stripe, with ${m.charityName}'s name on it.`,
      "",
      `Your entry page: ${m.entryUrl}`,
      "",
      "No donation was necessary to enter or win — and every entry counts the same, free or bonus.",
      ...signoff(m),
    ]),
  });
}

/** E4 / E5 — winner or alternate. */
export function sendWinnerNotification(
  m: EntrantBase & {
    alternate: boolean;
    arvCents: number;
    claimUrl: string;
    deadlineLabel: string;
    rulesUrl: string;
    verifyUrl: string;
  },
) {
  return send({
    to: m.to,
    replyTo: m.charityReplyTo,
    onBehalfOf: m.charityName,
    subject: m.alternate
      ? `The prize is yours to claim — ${m.charityName} giveaway`
      : `You've been drawn as the winner — ${m.charityName} giveaway`,
    text: compact([
      `Hi ${m.firstName} —`,
      "",
      m.alternate
        ? `The first person drawn in ${m.charityName}'s giveaway for ${inlinePrize(m.prizeName)} didn't claim the prize, so it passes to the next person drawn: you. (Approximate value ${money(m.arvCents)}.)`
        : `You were drawn as the winner of ${m.charityName}'s giveaway for ${inlinePrize(m.prizeName)} (approximate value ${money(m.arvCents)}).`,
      "",
      `To claim the prize, accept it by ${m.deadlineLabel}:`,
      m.claimUrl,
      "",
      `What happens next: ${m.charityName} will contact you to confirm you're eligible and arrange the prize. They may ask you to sign a short statement of eligibility and for tax information (a W-9). Prizes count as taxable income for the winner.`,
      "",
      "You will never be asked to pay anything to receive this prize. If anyone asks, it isn't us.",
      "",
      `If you don't accept by the deadline, the prize passes to the next person drawn, as the Official Rules explain: ${m.rulesUrl}`,
      "",
      `How you were chosen: ${m.verifyUrl}`,
      ...signoff(m),
    ]),
  });
}

/**
 * Sent the moment entries lock, before the deciding drand round exists —
 * an outside, timestamped record (in the charity's inbox) of the pool
 * fingerprint and target round. Also copied to Yufora staff.
 */
export function sendLockReceipt(m: {
  to: string[];
  prizeName: string;
  poolSize: number;
  entrantCount: number;
  poolHash: string;
  targetRound: number;
  targetRoundLabel: string;
  verifyUrl: string;
}) {
  return send({
    to: m.to,
    subject: `Entries locked: ${m.prizeName}`,
    text: compact([
      `Entries for the "${m.prizeName}" giveaway are locked.`,
      "",
      `Eligible entries: ${m.poolSize.toLocaleString("en-US")} from ${m.entrantCount.toLocaleString("en-US")} people`,
      `Entry list fingerprint (SHA-256): ${m.poolHash}`,
      `Deciding drand round: ${m.targetRound} (published ${m.targetRoundLabel})`,
      "",
      "Keep this email: it records the entry list and the random round before that round existed, so nobody — including Yufora — could have chosen the result.",
      "",
      `Results page: ${m.verifyUrl}`,
      "",
      "— Yufora",
    ]),
  });
}

/** E7 — the winner accepted. */
export function sendCharityWinnerAccepted(m: {
  to: string;
  prizeName: string;
  winnerName: string;
  winnerEmail: string;
  acceptedLabel: string;
  adminUrl: string;
  taxFormLikely: boolean;
}) {
  return send({
    to: m.to,
    subject: `Your winner accepted: ${m.prizeName}`,
    text: compact([
      `${m.winnerName} accepted the "${m.prizeName}" prize on ${m.acceptedLabel}.`,
      "",
      "Next steps:",
      "1. Send them an affidavit of eligibility and a liability release to sign.",
      m.taxFormLikely
        ? "2. Collect a W-9 — a prize at this value is generally reported on Form 1099-MISC. Confirm with your accountant."
        : "2. Check with your accountant whether you need a W-9 for a prize at this value.",
      "3. Deliver the prize, then mark it delivered in Yufora.",
      "",
      `Their email: ${m.winnerEmail}`,
      `Your giveaway: ${m.adminUrl}`,
      "",
      "— Yufora",
    ]),
  });
}

/** E8 — the winner declined (the time-based "didn't respond" case shows on
 *  the dashboard until a scheduled job exists). */
export function sendCharityClaimDeclined(m: {
  to: string;
  prizeName: string;
  claimDays: number;
  adminUrl: string;
}) {
  return send({
    to: m.to,
    subject: `Your winner declined the prize: ${m.prizeName}`,
    text: compact([
      `The person drawn for the "${m.prizeName}" giveaway declined the prize.`,
      "",
      `Your Official Rules say it passes to the next alternate, who'll be emailed and given ${m.claimDays} days to accept. Pass it on here: ${m.adminUrl}`,
      "",
      "— Yufora",
    ]),
  });
}
