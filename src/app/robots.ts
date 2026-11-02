import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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
