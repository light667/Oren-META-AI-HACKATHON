/**
 * Tous les textes visibles par l'utilisateur, en français.
 * Règle AGENTS.md n°9 : aucun texte visible hors de ce fichier.
 * Le nom du produit est une variable : NEXT_PUBLIC_PRODUCT_NAME.
 */
export const productName =
  process.env.NEXT_PUBLIC_PRODUCT_NAME?.trim() || "Oren";

export const fr = {
  app: {
    title: productName,
    tagline: "Assistant IA pour les petites entreprises",
    description:
      "Un assistant qui répond à vos clients en français et agit : commandes, passage à un humain, et plus.",
  },
  home: {
    heading: "Bienvenue chez",
    intro:
      "Cette page prouve que le projet démarre. L'assistant client, les commandes et l'espace patron arrivent dans les tâches suivantes.",
    cardTitle: "État du projet",
    cardDescription: "Initialisation terminée, vérification de l'API Meta en cours.",
    nameLabel: "Nom de votre entreprise",
    namePlaceholder: "Ex. Chez Chef T, Lomé",
    primaryAction: "Commencer",
    dialogTrigger: "Voir le détail",
    dialogTitle: "Ce qui est en place",
    dialogBody:
      "Next.js, Tailwind CSS, shadcn/ui, Vitest et Zod sont installés. Les fournisseurs IA, paiement, notification et SMS ont chacun une interface remplaçable.",
    dialogClose: "Fermer",
    aiNotice: "Vous parlez à un assistant IA. Vous pouvez demander un humain à tout moment.",
  },
  common: {
    loading: "Chargement…",
    error: "Une erreur est survenue.",
    unknown: "Je ne sais pas.",
    askHuman: "Passer la main à un humain",
    currency: "FCFA",
  },
} as const;
