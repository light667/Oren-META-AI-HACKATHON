/**
 * Accord explicite du client (AGENTS.md règle 2).
 * Vocabulaire fermé : chaque mot du message doit appartenir au
 * vocabulaire d'accord, et au moins un mot fort doit être présent.
 * « oui mais enlève la boisson », « oui non », « pas oui » ne sont
 * donc pas des accords. Dans le doute, ce n'est pas un accord.
 */

const ALLOWED_TOKENS = new Set([
  "oui",
  "ok",
  "okay",
  "d",
  "accord",
  "daccord",
  "dacc",
  "je",
  "confirme",
  "confirmer",
  "valide",
  "valider",
  "vas",
  "y",
  "allez",
  "c",
  "est",
  "cest",
  "bon",
  "parfait",
  "entendu",
  "ca",
  "marche",
  "merci",
  "bien",
  "sur",
  "svp",
]);

const STRONG_TOKENS = new Set([
  "oui",
  "ok",
  "okay",
  "accord",
  "daccord",
  "dacc",
  "confirme",
  "confirmer",
  "valide",
  "valider",
  "vas",
  "allez",
  "bon",
  "parfait",
  "entendu",
  "marche",
]);

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isExplicitAgreement(text: string): boolean {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  const tokens = normalized.split(" ");
  if (!tokens.every((token) => ALLOWED_TOKENS.has(token))) return false;
  return tokens.some((token) => STRONG_TOKENS.has(token));
}
