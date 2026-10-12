import "server-only";
import { isStaffEmail } from "../session";
import { RULES_TEMPLATE_VERSION } from "./constants";
import { ADMINISTRATOR } from "./legal-copy";

/**
 * The one go-live switch: counsel has approved THIS version of the Rules
 * template, and the Administrator section has a mailing address. Editing
 * the template bumps RULES_TEMPLATE_VERSION, which closes go-live again
 * until the new text is approved. Set the env var in Production only —
 * preview deployments share the production database.
 *
 * Server-only on purpose: never read from lib/site.ts (client-imported).
 */
export function isGiveawaysGoLiveOpen(): boolean {
  return (
    process.env.GIVEAWAYS_APPROVED_RULES_VERSION === RULES_TEMPLATE_VERSION &&
    ADMINISTRATOR.mailingAddress !== null
  );
}

/**
 * Who can build giveaways in the admin. Everyone, now that the marketing
 * page is public — going live is still gated by isGiveawaysGoLiveOpen().
 * Set to false to hide the admin from non-staff again.
 */
const GIVEAWAYS_OPEN_TO_ALL = true;

export function canUseGiveaways(email: string): boolean {
  return GIVEAWAYS_OPEN_TO_ALL || isStaffEmail(email);
}
