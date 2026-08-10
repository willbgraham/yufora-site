import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import localFont from "next/font/local";
import { siteConfig } from "@/lib/site";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-figtree",
});

/**
 * Libertinus Math (SIL OFL, self-hosted — not on Google Fonts), subset
 * to Latin so the display face costs 25KB instead of 396KB of math
 * glyphs. Single weight; headings pin font-weight 400 in globals.css.
 */
const libertinus = localFont({
  src: "./fonts/LibertinusMath-Regular.woff2",
  weight: "400",
  display: "swap",
  variable: "--font-display-serif",
});

export const metadata: Metadata = {
  // Required for OG image URLs to resolve absolutely — a very common omission.
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    url: siteConfig.url,
  },
  twitter: { card: "summary_large_image" },
  // No `icons` key: app/icon.png and app/apple-icon.png are picked up by
  // Next's file convention. Declaring both would conflict.
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${figtree.variable} ${libertinus.variable}`}>
      <body>{children}</body>
    </html>
  );
}
