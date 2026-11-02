import { productName } from "@/i18n/fr";

/**
 * Logo « briques » choisi par le fondateur (Tâche D5 / docs/DESIGN.md).
 * En SVG d'une seule couleur (currentColor), coloré avec le vert
 * de la marque (#0ebb7c).
 * Une seule source dans tout le projet : ce composant.
 */
export function LogoMark({
  className = "h-8 w-8 text-[#0ebb7c]",
  monochrome = false,
}: {
  className?: string;
  monochrome?: boolean;
}) {
  void monochrome;
  return (
    <svg
      viewBox="0 0 72 48"
      fill="currentColor"
      className={`shrink-0 ${className}`}
      role="img"
      aria-label={productName}
    >
      <rect x="15" y="1" width="19" height="12" rx="4" />
      <rect x="38" y="1" width="19" height="12" rx="4" />
      <rect x="8" y="17" width="27" height="12" rx="4" />
      <rect x="39" y="17" width="27" height="12" rx="4" />
      <rect x="1" y="33" width="19" height="12" rx="4" />
      <rect x="24" y="33" width="31" height="12" rx="4" />
      <rect x="59" y="33" width="12" height="12" rx="4" />
    </svg>
  );
}

/** Logo complet (symbole briques + nom Oren). */
export function Logo({
  className = "",
  markClassName = "h-7 w-7 text-[#0ebb7c]",
  wordmarkClassName = "font-heading text-xl font-extrabold tracking-tight text-foreground",
  showMark = true,
  useOfficialImage = false,
}: {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  showMark?: boolean;
  useOfficialImage?: boolean;
}) {
  void useOfficialImage;
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {showMark && <LogoMark className={markClassName} />}
      <span className={wordmarkClassName}>{productName}</span>
    </span>
  );
}
