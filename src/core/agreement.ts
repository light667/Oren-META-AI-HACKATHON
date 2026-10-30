/**
 * Accord explicite du client (AGENTS.md règle 2).
 *
 * Acceptés (après normalisation, ponctuation et politesses finales
 * retirées) : « oui », « ok », « d'accord », « c'est bon », « je valide »,
 * « vas-y », « je confirme » et leurs combinaisons directes simples.
 * Refusés : toute question (« et la boisson ? »), toute modification
 * (« oui mais… », « oui, et ajoute… »), toute négation. Dans le doute,
 * ce n'est pas un accord : le bouton « Je confirme » de l'interface,
 * qui envoie l'action structurée avec le jeton, est le chemin principal.
 */

const ACCEPTED = new Set([
  "oui",
  "ok",
  "okay",
  "d accord",
  "daccord",
  "c est bon",
  "cest bon",
  "je valide",
  "valide",
  "vas y",
  "allez y",
  "je confirme",
  "confirme",
  "confirmer",
  "oui je confirme",
  "oui d accord",
  "ok d accord",
  "d accord merci",
  "oui merci",
  "c est bon merci",
  "parfait",
  "entendu",
  "ca marche",
]);

const POLITE_SUFFIXES = ["merci", "svp", "s il vous plait", "sil vous plait"];

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
  // Une question n'est jamais un accord : « et la boisson ? », « oui, et… ? »
  if (text.includes("?") || text.includes("？")) return false;
  let normalized = normalizeText(text);
  if (!normalized) return false;
  // Négations et réserves : « non », « pas d'accord », « oui mais… », « annule »
  if (
    /(^|\s)(non|pas|mais|annule|annuler|stop|attends|attendre)(\s|$)/.test(normalized)
  ) {
    return false;
  }
  // Une demande d'ajout ou de changement n'est pas un accord à ce récapitulatif.
  if (/^(et|ajoute|ajouter|enlève|enleve|retire|change|changer)(\s|$)/.test(normalized)) {
    return false;
  }
  for (const suffix of POLITE_SUFFIXES) {
    if (normalized.endsWith(` ${suffix}`)) {
      normalized = normalized.slice(0, -(suffix.length + 1)).trim();
    }
  }
  if (ACCEPTED.has(normalized)) return true;
  // Combinaisons d'accords nets (« ok, vas-y », « oui, je confirme ») :
  // le message ne doit contenir que des formules d'accord, rien d'autre.
  // « ok, ajoute un jus » échoue ici : « ajoute » n'est pas un accord.
  const phrases = [...ACCEPTED]
    .map((p) => p.split(" "))
    .sort((a, b) => b.length - a.length);
  const words = normalized.split(" ");
  let index = 0;
  while (index < words.length) {
    const match = phrases.find(
      (p) =>
        p.length <= words.length - index &&
        p.every((word, j) => words[index + j] === word),
    );
    if (!match) return false;
    index += match.length;
  }
  return index > 0;
}
