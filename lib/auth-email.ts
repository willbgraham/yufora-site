import "server-only";

/**
 * Sends the sign-in (magic link) email.
 *
 * Same fallback principle as the lead form: with no RESEND_API_KEY the link
 * is logged to the server console instead, so local sign-in works with zero
 * email setup — copy the URL from the terminal.
 */
export async function sendMagicLinkEmail(email: string, url: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM ?? process.env.LEAD_NOTIFY_FROM;

  if (!apiKey || !from) {
    console.info(`[auth] magic link for ${email}:\n${url}`);
    return;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: "Your Yufora sign-in link",
    text: [
      "Click to sign in to Yufora:",
      "",
      url,
      "",
      "This link expires shortly and can only be used once.",
      "If you didn't request it, you can safely ignore this email.",
    ].join("\n"),
  });

  if (error) {
    // Surface in logs; Better Auth will report a failed send to the client.
    console.error("[auth] magic link send failed", error);
    throw new Error("Failed to send sign-in email");
  }
}
