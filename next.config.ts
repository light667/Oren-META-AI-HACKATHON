import type { NextConfig } from "next";

// Pas de `output: "export"` : l'app est une app serveur (Vercel).
// Routes API, /auth/callback (cookies + échange de code Supabase),
// cron et Server Components dynamiques sont incompatibles avec
// un export 100 % statique.
const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
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
