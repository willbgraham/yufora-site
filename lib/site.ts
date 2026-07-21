export const siteConfig = {
  name: "Yufora",
  tagline: "Show your donors exactly what you need.",
  description:
    "Yufora gives nonprofits a wishlist shop and skill-based contests that run on their own website — with the money going straight into their own account.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  email: "hello@yufora.com",
} as const;

export type NavItem = { href: string; label: string; desc?: string };
export type NavEntry = NavItem | { label: string; items: NavItem[] };

/**
 * Header navigation. Grouped to mirror the brand split the whole site is
 * built on: Products are self-serve tools the charity runs; Services are
 * done-for-you work. Keeping that distinction in the nav reinforces it.
 */
export const navGroups: NavEntry[] = [
  {
    label: "Products",
    items: [
      { href: "/shop", label: "Wishlist shop", desc: "Fund the things you need" },
      { href: "/donor-wall", label: "Donor wall", desc: "Live giving on your site" },
      { href: "/contests", label: "Contests", desc: "Grow your donor list" },
    ],
  },
  {
    label: "Services",
    items: [
      { href: "/films", label: "Films", desc: "Documentaries & content packs" },
      {
        href: "/services#adgrants-heading",
        label: "Google Ad Grants",
        desc: "$10k/mo in free ads, managed",
      },
      {
        href: "/services#email-heading",
        label: "Email marketing",
        desc: "Welcome, stewardship, appeals",
      },
      {
        href: "/services#design-heading",
        label: "Design Studio",
        desc: "Graphics, posters & merch",
      },
    ],
  },
  { href: "/news", label: "News" },
  { href: "/about", label: "About" },
];

/** Flat list for the footer. */
export const footerLinks: NavItem[] = navGroups.flatMap((entry) =>
  "items" in entry ? entry.items : [entry],
);

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
