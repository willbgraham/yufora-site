import "server-only";
import type { Lead } from "./schema";

/**
 * Delivers a lead by email.
 *
 * Critical property: this must NOT throw or fail the build when
 * RESEND_API_KEY is absent. The site has to deploy before email is
 * configured, and no lead may be silently lost in that gap — so we always
 * log the full payload before doing anything else.
 */
export async function deliverLead(
  lead: Lead,
): Promise<{ ok: boolean; delivered: boolean }> {
  // Always log first, so the lead survives in Vercel's function logs even if
  // the provider is down or unconfigured.
  console.info("[lead]", JSON.stringify(lead));

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_NOTIFY_TO;
  const from = process.env.LEAD_NOTIFY_FROM;

  if (!apiKey || !to || !from) {
    console.info(
      "[lead] email not configured (need RESEND_API_KEY, LEAD_NOTIFY_TO, LEAD_NOTIFY_FROM) — logged only",
    );
    return { ok: true, delivered: false };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    const lines = [
      `Organization: ${lead.orgName}`,
      `Name:         ${lead.contactName}`,
      `Email:        ${lead.email}`,
      `Role:         ${lead.role}`,
      `Interested in: ${lead.interests.join(", ")}`,
      lead.budget ? `Budget:       ${lead.budget}` : null,
      "",
      lead.message ? `Planning:\n${lead.message}` : "(no message)",
    ]
      .filter(Boolean)
      .join("\n");

    const { error } = await resend.emails.send({
      from,
      to,
      // Lets you reply straight from your inbox to the nonprofit.
      replyTo: lead.email,
      subject: `Early access request — ${lead.orgName}`,
      text: lines,
    });

    if (error) {
      console.error("[lead] resend error", error);
      return { ok: false, delivered: false };
    }

    return { ok: true, delivered: true };
  } catch (err) {
    console.error("[lead] delivery threw", err);
    return { ok: false, delivered: false };
  }
}
