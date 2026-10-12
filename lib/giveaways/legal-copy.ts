import { stateName } from "../us-states";
import { minimumAgeFor } from "./constants";

/**
 * COUNSEL-REVIEWED TEXT — do not edit without re-review, and bump
 * RULES_TEMPLATE_VERSION (lib/giveaways/constants.ts) with any change.
 *
 * Every legally significant string shown OUTSIDE the Official Rules lives
 * here: the entry form's checkboxes, the "no donation necessary" line, the
 * eligibility summary, the odds line, checkout copy and attestations. The
 * Rules themselves are in rules-template.ts beside this file.
 *
 * STATUS: DRAFT, pending review by a promotions lawyer.
 */

/** Administrator identity, printed in every set of Rules. */
export const ADMINISTRATOR = {
  legalName: "Yufora, LLC",
  email: "hello@yufora.com",
  /**
   * Yufora's mailing address (GIVEAWAYS_ADMIN_ADDRESS). Server-side only —
   * the Rules are rendered on the server. Going live stays closed while
   * it's unset, so Rules can never freeze with a blank Administrator.
   */
  get mailingAddress(): string | null {
    return process.env.GIVEAWAYS_ADMIN_ADDRESS?.trim() || null;
  },
};

export const NO_DONATION_NECESSARY = "No donation necessary to enter or win.";

/** PENDING COUNSEL: whether the conventional "a donation will not increase
 *  your chances of winning" may also be used alongside bonus entries. */
export const SAME_LIMIT_FOR_EVERYONE =
  "A donation never raises anyone's entry limit: entering free on every day of the giveaway reaches the same maximum.";

export const EQUAL_WEIGHT = "Every entry counts the same, free or bonus.";

export const ODDS_LINE =
  "Odds of winning depend on the number of eligible entries received.";

export const VOID_WHERE_PROHIBITED = "Void where prohibited.";

/** Short eligibility line for cards and footers. */
export const ELIGIBILITY_SUMMARY =
  "Open to legal residents of the 50 US states and DC, except Rhode Island, who are 18 or older (19 in Alabama and Nebraska, 21 in Mississippi).";

export function ageAttestation(state: string | null): string {
  if (!state) {
    return "I'm old enough to enter and a legal resident of the state I chose.";
  }
  return `I'm ${minimumAgeFor(state)} or older and a legal resident of ${stateName(state)}.`;
}

export const RULES_AGREEMENT = "I've read and agree to the Official Rules.";

export const PUBLIC_DISPLAY_OPT_IN =
  "If I win, it's okay to show my first name and last initial on the results page.";

export function marketingOptIn(charityName: string): string {
  return `Send me news from ${charityName}.`;
}

export const MARKETING_HINT = "Entering doesn't sign you up for anything else.";

export function cardFooter(sponsorLegalName: string): string {
  return `Free to enter — no donation needed. ${ELIGIBILITY_SUMMARY} ${VOID_WHERE_PROHIBITED} ${ODDS_LINE} Sponsor: ${sponsorLegalName || "the nonprofit running this giveaway"}. Administered by Yufora.`;
}

export function bonusNote(args: {
  charityName: string;
  dollarsPerEntry: string;
  cap: number;
}): string {
  return `After you enter, you can add bonus entries with a donation to ${args.charityName}: 1 for every ${args.dollarsPerEntry}, up to ${args.cap} entries per person in total.`;
}

/** Stripe Checkout line item. */
export function checkoutDescription(args: {
  entries: number;
  prizeName: string;
}): string {
  return `Adds ${args.entries} bonus ${args.entries === 1 ? "entry" : "entries"} to the "${args.prizeName}" giveaway. ${NO_DONATION_NECESSARY}`;
}

/** Checked by the charity at go-live. */
export function sponsorAttestation(sponsorLegalName: string): string {
  return `${sponsorLegalName} is the Sponsor of this giveaway. I've read the Official Rules, and we'll award the prize as they describe.`;
}

/** Checked by the winner when accepting. */
export function claimAttestation(args: {
  state: string;
  sponsorLegalName: string;
}): string {
  return `I'm ${minimumAgeFor(args.state)} or older and a legal resident of ${stateName(args.state)}, I'm not an employee, officer or director of ${args.sponsorLegalName} or Yufora (or in the household or immediate family of one), and I accept the prize under the Official Rules.`;
}
