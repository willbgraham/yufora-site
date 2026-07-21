import { z } from "zod";

export const ROLES = [
  "Executive Director",
  "Development / Fundraising",
  "Marketing & Comms",
  "Board member",
  "Other",
] as const;

export const INTERESTS = [
  { value: "shop", label: "Wishlist shop" },
  { value: "managed-store", label: "Done-for-you shop / store" },
  { value: "contests", label: "Contests" },
  { value: "films", label: "A documentary film" },
  { value: "content-packs", label: "Content packs" },
  { value: "ad-grants", label: "Google Ad Grants management" },
  { value: "email-marketing", label: "Email marketing" },
  { value: "unsure", label: "Not sure yet" },
] as const;

export const BUDGETS = [
  "Under $100k",
  "$100k – $500k",
  "$500k – $2M",
  "$2M+",
] as const;

export const leadSchema = z.object({
  orgName: z.string().trim().min(2, "Please enter your organization's name").max(120),
  contactName: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.email("Please enter a valid email address").max(160),
  role: z.enum(ROLES, { message: "Please choose your role" }),
  // The highest-value field on the site: it tells us what to build first.
  interests: z
    .array(z.enum(INTERESTS.map((i) => i.value) as [string, ...string[]]))
    .min(1, "Please choose at least one"),
  budget: z.enum(BUDGETS).optional(),
  message: z.string().trim().max(2000).optional(),
});

export type Lead = z.infer<typeof leadSchema>;

/** Anti-spam: honeypot must be empty, and the form must not be submitted
 *  faster than a human could plausibly fill it in. */
export const MIN_FILL_MS = 3000;
export const HONEYPOT_FIELD = "website";
