import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

/**
 * Indexing is OFF unless NEXT_PUBLIC_ALLOW_INDEXING === "true".
 * This keeps preview/staging deployments out of search results, and makes
 * going live a deliberate one-line flip in the production environment rather
 * than something that could accidentally block the real site.
 */
const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";

export default function robots(): MetadataRoute.Robots {
  if (!allowIndexing) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
