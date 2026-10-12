import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { stateName } from "../us-states";
import { addDaysIso, lastEntryIsoDate, zonedMidnight } from "./calendar";
import {
  ALTERNATES,
  DRAW_WITHIN_DAYS,
  RULES_TEMPLATE_VERSION,
  timezoneShort,
} from "./constants";
import { clockTime, dateTime, endMoment, longDate, money } from "./format";
import { ADMINISTRATOR } from "./legal-copy";
import type { RulesDocument, RulesSection } from "./types";

/**
 * COUNSEL-REVIEWED TEXT — do not edit without re-review, and bump
 * RULES_TEMPLATE_VERSION (lib/giveaways/constants.ts) with any change.
 *
 * STATUS: DRAFT, pending review by a promotions lawyer.
 *
 * renderRules is a pure function of the giveaway's settings. The admin
 * Rules preview and go-live call the SAME function, so what a charity
 * previews is exactly what freezes. At go-live the rendered document (not
 * the settings) is stored, so a later template edit can never change a
 * live giveaway's Rules.
 */

export type RulesInput = {
  campaignId: string;
  charityName: string;
  charitySlug: string;
  origin: string;
  prizeName: string;
  prizeDescription: string;
  prizeArvCents: number;
  timezone: string;
  startsAt: Date;
  endsAt: Date;
  drawAt: Date;
  freeEntriesPerDay: number;
  perPersonCap: number;
  donationsEnabled: boolean;
  centsPerEntry: number | null;
  claimDeadlineDays: number;
  sponsorLegalName: string;
  sponsorStreet: string;
  sponsorCity: string;
  sponsorState: string;
  sponsorZip: string;
  sponsorPrivacyUrl: string | null;
  /** Null in previews; the real commitment is generated at go-live. */
  seedCommit: string | null;
};

export function giveawayUrls(origin: string, charitySlug: string, campaignId: string) {
  const page = `${origin}/s/${charitySlug}/giveaways/${campaignId}`;
  return { page, rules: `${page}/rules`, verify: `${page}/verify` };
}

const blank = (v: string, label: string) => (v.trim() ? v.trim() : `[${label}]`);

export function renderRules(input: RulesInput): RulesDocument {
  const tz = input.timezone;
  const zone = timezoneShort(tz);
  const urls = giveawayUrls(input.origin, input.charitySlug, input.campaignId);
  const sponsorName = blank(input.sponsorLegalName, "Sponsor legal name");
  const sponsorAddress = [
    blank(input.sponsorStreet, "street address"),
    `${blank(input.sponsorCity, "city")}, ${blank(input.sponsorState, "state")} ${blank(input.sponsorZip, "ZIP")}`,
  ].join(", ");
  const adminAddress =
    ADMINISTRATOR.mailingAddress ?? "[Administrator mailing address]";
  const lastIso = lastEntryIsoDate(input.endsAt, tz);
  const drawByIso = addDaysIso(lastIso, DRAW_WITHIN_DAYS);
  const drawBy = longDate(zonedMidnight(drawByIso, tz), tz);
  const winnerListBy = longDate(zonedMidnight(addDaysIso(lastIso, 60), tz), tz);
  const rate =
    input.donationsEnabled && input.centsPerEntry ? money(input.centsPerEntry) : null;
  const governingState = input.sponsorState.trim()
    ? stateName(input.sponsorState.trim())
    : "[Sponsor's state]";

  const sections: RulesSection[] = [
    {
      id: "sponsor",
      heading: "1. Sponsor and Administrator",
      paragraphs: [
        `The sponsor of the "${input.prizeName}" giveaway (the "Giveaway") is ${sponsorName}, ${sponsorAddress} (the "Sponsor"). The Sponsor provides the prize and is responsible for the Giveaway.`,
        `${ADMINISTRATOR.legalName}, ${adminAddress} (the "Administrator"), runs the online entry form, sends Giveaway emails on the Sponsor's behalf, and conducts the drawing. The Administrator is not the Sponsor and provides no prize.`,
        "The Giveaway is not sponsored, endorsed or administered by, or associated with, any social media platform.",
      ],
    },
    {
      id: "eligibility",
      heading: "2. Who can enter",
      paragraphs: [
        "The Giveaway is open only to legal residents of the 50 United States and the District of Columbia, excluding Rhode Island, who are at least 18 years old (19 in Alabama and Nebraska; 21 in Mississippi) at the time of entry.",
        "Employees, officers and directors of the Sponsor and of the Administrator, and members of their immediate families (spouse, parents, siblings and children) and households, are not eligible.",
        "The Giveaway is subject to all applicable federal, state and local laws and regulations. Void where prohibited.",
      ],
    },
    {
      id: "period",
      heading: "3. Promotion Period",
      paragraphs: [
        `The Giveaway begins at ${clockTime(input.startsAt, tz)} on ${longDate(input.startsAt, tz)} and ends at ${endMoment(input.endsAt, tz)} (the "Promotion Period"). All times are ${zone}. The Administrator's computer clock is the official timekeeper.`,
      ],
    },
    {
      id: "enter",
      heading: "4. How to enter",
      paragraphs: [
        `Free entry: during the Promotion Period, complete the entry form at ${urls.page} (or on the Sponsor's website where the same form is shown) and confirm your entry by clicking the link in the email you receive. An entry counts only once it is confirmed, and confirmations must be completed within 24 hours after the Promotion Period ends. After your first entry, you may enter free up to ${input.freeEntriesPerDay} ${input.freeEntriesPerDay === 1 ? "time" : "times"} per calendar day (${zone}) using the personal entry link in your confirmation email.`,
        ...(rate
          ? [
              `Bonus entries with a donation: after entering free, you may also receive bonus entries by making a donation to the Sponsor through your personal entry page: one (1) bonus entry for every ${rate} donated, rounded down. Donations are processed by the Sponsor's payment processor and go to the Sponsor. If a donation is refunded before the drawing, the bonus entries it added are cancelled.`,
              "Entries received by either method have an equal chance of winning. No donation is necessary to enter or win.",
            ]
          : []),
      ],
    },
    {
      id: "limits",
      heading: "5. Entry limits",
      paragraphs: [
        `Each person may have at most ${input.perPersonCap} total ${input.perPersonCap === 1 ? "entry" : "entries"} in the Giveaway, counting every entry method together. Each person may use only one email address. Entries made using multiple email addresses, identities, scripts, bots or other automated means are void.`,
        ...(rate
          ? [
              "Entering free on every calendar day of the Promotion Period allows any eligible person to reach the same maximum number of entries as a person who donates.",
            ]
          : []),
      ],
    },
    {
      id: "odds",
      heading: "6. Odds",
      paragraphs: [
        "The odds of winning depend on the total number of eligible entries received during the Promotion Period.",
      ],
    },
    {
      id: "prize",
      heading: "7. Prize",
      paragraphs: [
        `One (1) prize will be awarded: ${input.prizeName}.${input.prizeDescription.trim() ? ` ${input.prizeDescription.trim()}` : ""}`,
        `Approximate retail value: ${money(input.prizeArvCents)}. No cash alternative, transfer or substitution of the prize is permitted, except that the Sponsor may substitute a prize of equal or greater value if the advertised prize becomes unavailable. Any details of the prize not specified in these Official Rules are at the Sponsor's discretion.`,
      ],
    },
    {
      id: "drawing",
      heading: "8. Drawing",
      paragraphs: [
        `The winner will be selected in a random drawing from all eligible entries, conducted by the Administrator after ${dateTime(input.drawAt, tz)} and no later than ${drawBy}. ${ALTERNATES} alternate winners will be drawn in order at the same time.`,
        `The drawing uses a published commit-reveal method: before the Promotion Period, the Administrator published a cryptographic commitment to a secret value${input.seedCommit ? ` (commitment: ${input.seedCommit})` : ""}. At the drawing, the list of eligible entries is fixed and its fingerprint published, and the result is computed from that secret, the entry list and a future public random value from the drand randomness beacon. The method, the published values and instructions for checking the result are at ${urls.verify}.`,
      ],
    },
    {
      id: "claim",
      heading: "9. Winner notification and claim",
      paragraphs: [
        `The potential winner will be notified by email promptly after the drawing and must accept the prize using the link in that email within ${input.claimDeadlineDays} days of notification.`,
        "The Sponsor may require the potential winner to sign and return an affidavit of eligibility, a liability release and (where required) a publicity release, and to provide tax information such as a Form W-9. These are collected directly by the Sponsor, not the Administrator.",
        `If a potential winner cannot be reached, does not accept within ${input.claimDeadlineDays} days, declines, does not return required documents, or is found ineligible, the prize will be forfeited and offered to the next alternate in order. If no alternate claims the prize, it will not be awarded except as required by law.`,
      ],
    },
    {
      id: "taxes",
      heading: "10. Taxes",
      paragraphs: [
        "The winner is responsible for all federal, state and local taxes on the prize. The Sponsor will issue an IRS Form 1099 where required by law.",
      ],
    },
    {
      id: "conditions",
      heading: "11. General conditions",
      paragraphs: [
        "The Sponsor and Administrator may disqualify any person who tampers with the entry process, violates these Official Rules, or acts in a disruptive or fraudulent manner.",
        "If fraud, technical failure or any other cause beyond the Sponsor's control corrupts the administration, security or fairness of the Giveaway, the Sponsor may cancel, modify or suspend it and, subject to applicable law, award the prize in a random drawing from eligible entries received before the action was taken.",
      ],
    },
    {
      id: "release",
      heading: "12. Release and limitation of liability",
      paragraphs: [
        "By entering, entrants release the Sponsor and the Administrator, and their officers, directors, employees and agents, from liability for any injury, loss or damage arising from participation in the Giveaway or acceptance or use of the prize.",
        "The Sponsor and Administrator are not responsible for lost, late, incomplete, misdirected or undeliverable entries or emails, or for any computer, network or technical malfunction.",
      ],
    },
    {
      id: "law",
      heading: "13. Disputes and governing law",
      paragraphs: [
        `These Official Rules are governed by the laws of ${governingState}, without regard to its conflict-of-law rules. Any dispute will be resolved individually, without resort to any form of class action.`,
      ],
    },
    {
      id: "privacy",
      heading: "14. Privacy",
      paragraphs: [
        `The Sponsor collects entrants' information through the Administrator, which processes it on the Sponsor's behalf to run the Giveaway. The Sponsor will add an entrant to its own mailing list only if the entrant checks the box to opt in. The Administrator does not use entrant information for its own marketing and does not sell it. See ${input.origin}/privacy${input.sponsorPrivacyUrl ? ` and ${input.sponsorPrivacyUrl}` : ""}.`,
      ],
    },
    {
      id: "publicity",
      heading: "15. Publicity",
      paragraphs: [
        `The winner's first name and last initial will appear at ${urls.verify} only if the winner agreed to it when entering. Otherwise only anonymous entry numbers are published.`,
      ],
    },
    {
      id: "winner-list",
      heading: "16. Winner list",
      paragraphs: [
        `The result is published at ${urls.verify}. For the winner's name, where permitted, send a self-addressed stamped envelope to the Sponsor at the address above, marked "${input.prizeName} Giveaway Winner List," to be received by ${winnerListBy}.`,
      ],
    },
    {
      id: "contact",
      heading: "17. Contact",
      paragraphs: [
        `Questions about the prize: the Sponsor, ${sponsorName}, ${sponsorAddress}. Questions about the entry form, emails or drawing: the Administrator at ${ADMINISTRATOR.email}.`,
      ],
    },
  ];

  return {
    version: RULES_TEMPLATE_VERSION,
    title: `Official Rules — "${input.prizeName}" Giveaway`,
    headline: [
      "No purchase or donation necessary to enter or win.",
      rate
        ? "A donation does not raise anyone's entry limit; entering free on every day of the Promotion Period reaches the same maximum."
        : "Entry is free.",
      "Void where prohibited.",
      `Open only to legal residents of the 50 United States and D.C., excluding Rhode Island, who are 18 or older (19 in AL and NE; 21 in MS). Ends ${endMoment(input.endsAt, tz)}.`,
    ],
    sections,
  };
}

/** Canonical plain text of a Rules document — what rulesHash covers. */
export function rulesToText(doc: RulesDocument): string {
  const out = [doc.title, `Template ${doc.version}`, "", ...doc.headline, ""];
  for (const s of doc.sections) {
    out.push(s.heading, ...s.paragraphs, "");
  }
  return out.join("\n");
}

export function rulesHashOf(text: string): string {
  return bytesToHex(sha256(utf8ToBytes(text)));
}

/** Unfilled placeholders like "[street address]" — go-live must have none. */
export function rulesPlaceholders(text: string): string[] {
  return Array.from(text.matchAll(/\[([^\]\n]{2,60})\]/g), (m) => m[1]);
}
