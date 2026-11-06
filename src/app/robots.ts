import { siteUrl as getSiteUrl } from "@/lib/site-url";
import type { MetadataRoute } from "next";

const siteUrl = getSiteUrl();

/** Les moteurs indexent le public ; espace patron et API sont exclus. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/app", "/app/", "/api/", "/auth/", "/bienvenue"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
