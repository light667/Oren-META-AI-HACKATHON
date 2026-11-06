import type { NextConfig } from "next";

// Pas de `output: "export"` : l'app est une app serveur (Vercel).
// Routes API, session (cookies Supabase), cron et Server Components
// dynamiques sont incompatibles avec un export 100 % statique.

// En-têtes de sécurité appliqués à toutes les réponses.
// - COOP same-origin-allow-popups : requis par la connexion Google (popup Firebase).
// - Permissions-Policy : micro et caméra pour la mise en route (voix, photo du menu).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
