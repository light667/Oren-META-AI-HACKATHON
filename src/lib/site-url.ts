/**
 * URL publique du site (SEO, liens d'e-mail). Ordre : NEXT_PUBLIC_SITE_URL,
 * puis le domaine de production Vercel, puis l'URL du déploiement Vercel.
 * localhost n'est utilisé qu'hors Vercel (développement local).
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
