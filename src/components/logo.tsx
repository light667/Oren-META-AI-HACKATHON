import { productName } from "@/i18n/fr";

/**
 * Logo Oren (docs/DESIGN.md) : une bulle de dialogue arrondie avec un
 * point orange, suivie du mot-symbole en minuscules, police de titre.
 * La bulle prend la couleur du texte (currentColor) : le logo marche
 * en une couleur, en mode clair comme en mode sombre.
 */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} role="img" aria-label={productName}>
      <path
        d="M8 4h24a6 6 0 0 1 6 6v16a6 6 0 0 1-6 6H18l-9.2 6.4c-.9.6-2.3 0-2.3-1.2V32A6 6 0 0 1 4 26V10A6 6 0 0 1 8 4Z"
        transform="scale(0.92) translate(1.7 1)"
        className="fill-foreground"
      />
      <circle cx="20" cy="18" r="5.2" fill="#f97316" />
    </svg>
  );
}

export function Logo({
  className = "",
  markClassName = "h-8 w-8",
  wordmarkClassName = "font-heading text-2xl font-bold lowercase tracking-tight",
}: {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className={markClassName} />
      <span className={wordmarkClassName}>{productName.toLowerCase()}</span>
    </span>
  );
}
