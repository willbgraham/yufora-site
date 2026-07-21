export const siteConfig = {
  name: "Yufora",
  tagline: "Show your donors exactly what you need.",
  description:
    "Yufora gives nonprofits a wishlist shop and skill-based contests that run on their own website — with the money going straight into their own account.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  email: "hello@yufora.com",
} as const;

export const navLinks = [
  { href: "/shop", label: "Shop" },
  { href: "/donor-wall", label: "Donor wall" },
  { href: "/contests", label: "Contests" },
  { href: "/films", label: "Films" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
] as const;

/**
 * Single CTA wording across the whole site. Services are bookable today and
 * the shop platform is live with its first shops — the ask is real now.
 */
export const CTA_LABEL = "Get started";
export const CTA_HREF = "/start";

/**
 * Scheduling link (Cal.com/Calendly). When set, the /start page offers
 * "book 20 minutes" alongside the form; until then it falls back to email.
 */
export const BOOK_CALL_URL: string | null =
  "https://calendly.com/yufora-meeting/30min";
