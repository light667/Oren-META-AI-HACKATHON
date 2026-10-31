import { productName } from "@/i18n/fr";

/**
 * Logo Oren : pyramide de briques (construire son entreprise, brique
 * par brique). Le vert est la couleur de marque ; les briques neutres
 * utilisent currentColor, donc le logo s'inverse tout seul entre le
 * mode clair (briques sombres) et le mode sombre (briques claires).
 */
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 72 48" className={className} role="img" aria-label={productName}>
      <rect x="15" y="1" width="19" height="12" rx="4" className="fill-foreground" />
      <rect x="38" y="1" width="19" height="12" rx="4" fill="#00b368" />
      <rect x="8" y="17" width="27" height="12" rx="4" fill="#00b368" />
      <rect x="39" y="17" width="27" height="12" rx="4" className="fill-foreground" />
      <rect x="1" y="33" width="19" height="12" rx="4" className="fill-foreground" />
      <rect x="24" y="33" width="31" height="12" rx="4" fill="#00b368" />
      <rect x="59" y="33" width="12" height="12" rx="4" fill="#00b368" />
    </svg>
  );
}

export function Logo({
  className = "",
  markClassName = "h-9 w-9",
  wordmarkClassName = "text-xl font-bold tracking-tight",
}: {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className={markClassName} />
      <span className={wordmarkClassName}>{productName}</span>
    </span>
  );
}
