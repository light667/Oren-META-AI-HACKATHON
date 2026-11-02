import type { MetadataRoute } from "next";
import { fr } from "@/i18n/fr";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Pages publiques indexables. L'espace patron et les API restent hors sitemap. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: `${siteUrl}/${fr.home.demoSlug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    { url: `${siteUrl}/inscription`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/connexion`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
}
