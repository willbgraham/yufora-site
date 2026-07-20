import "server-only";
import { formatCents } from "./money";

type DonorEmailInput = {
  donorEmail: string;
  donorName: string | null;
  charityName: string;
  /** The charity owner's email — used as reply-to so replies reach them. */
  charityReplyTo: string | null;
  productTitle: string;
  amountCents: number;
  productUrl: string;
  nowFullyFunded: boolean;
};

/**
 * The warm confirmation from Yufora on behalf of the charity. This is the
 * SECOND email the donor gets — Stripe's payment receipt comes from the
 * charity's own account (they're the merchant of record).
 *
 * Must never throw: the donation is already recorded, and a failed email
 * must not fail the webhook.
 */
export async function sendDonorConfirmation(input: DonorEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.DONOR_EMAIL_FROM ?? process.env.LEAD_NOTIFY_FROM;

  const firstName = input.donorName?.split(/\s+/)[0];

  const text = [
    firstName ? `${firstName} —` : "Thank you!",
    "",
    `Your ${formatCents(input.amountCents)} just went toward "${input.productTitle}" for ${input.charityName}.`,
    input.nowFullyFunded
      ? `And with your gift, it's now FULLY FUNDED. You finished it.`
      : `You can watch it fill up here: ${input.productUrl}`,
    "",
    `The money goes directly to ${input.charityName} — their name is on your card statement, and your payment receipt from Stripe arrives separately.`,
    "",
    `Thank you for giving something real.`,
    "",
    `— Yufora, on behalf of ${input.charityName}`,
    input.charityReplyTo
      ? `(Reply to this email to reach ${input.charityName} directly.)`
      : "",
  ]
    .filter((line, i, arr) => line !== "" || arr[i - 1] !== "")
    .join("\n");

  try {
    if (!apiKey || !from) {
      console.info(
        `[donor-email] not configured — would have sent to ${input.donorEmail}:\n${text}`,
      );
      return;
    }

    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: input.donorEmail,
      replyTo: input.charityReplyTo ?? undefined,
      subject: input.nowFullyFunded
        ? `You finished it — "${input.productTitle}" is fully funded`
        : `Thank you — your gift to ${input.charityName}`,
      text,
    });
    if (error) console.error("[donor-email] send failed", error);
  } catch (err) {
    console.error("[donor-email] send threw", err);
  }
}
