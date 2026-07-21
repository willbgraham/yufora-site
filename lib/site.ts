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
  { href: "/contests", label: "Contests" },
  { href: "/films", label: "Films" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
] as const;

/**
 * Single CTA wording across the whole site. "Book a demo" would over-promise —
 * there is nothing to demo yet.
 */
export const CTA_LABEL = "Request early access";
export const CTA_HREF = "/request-access";
