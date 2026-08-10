import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

/** Returns the session or redirects to /signin. For admin pages. */
export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/signin");
  return session;
}

/**
 * Yufora staff — the small set of people who curate the global newsroom.
 * Env allowlist (YUFORA_STAFF_EMAILS, comma-separated), deliberately separate
 * from the per-charity getCharityForUser gate: a signed-in charity owner is
 * NOT staff. Absent env var → nobody is staff → the newsroom is closed but the
 * site still builds (same graceful-degradation principle as isStripeConfigured).
 */
export function isStaffEmail(email: string): boolean {
  const allow = (process.env.YUFORA_STAFF_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}

export const isStaffConfigured = () => Boolean(process.env.YUFORA_STAFF_EMAILS);

/** Session + staff check, or redirect. Call at the top of every /admin/news
 *  page AND every newsroom server action (per-action re-verification). */
export async function requireStaff() {
  const session = await requireSession();
  if (!isStaffEmail(session.user.email)) redirect("/admin");
  return session;
}
