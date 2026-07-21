import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { getPublishedArticles } from "@/lib/data/news";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = [
    "",
    "/shop",
    "/donor-wall",
    "/contests",
    "/films",
    "/services",
    "/news",
    "/about",
    "/start",
    "/privacy",
    "/terms",
  ];

  const staticEntries: MetadataRoute.Sitemap = routes.map((path) => ({
    url: `${siteConfig.url}${path}`,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.7,
  }));

  // Published articles. Falls back to the static routes if the DB isn't
  // reachable at build/request time, so the sitemap never hard-fails.
  let articleEntries: MetadataRoute.Sitemap = [];
  try {
    const articles = await getPublishedArticles();
    articleEntries = articles.map((a) => ({
      url: `${siteConfig.url}/news/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: "monthly",
      priority: 0.6,
    }));
  } catch {
    articleEntries = [];
  }

  return [...staticEntries, ...articleEntries];
}
