/**
 * Les réponses de l'assistant sont affichées telles quelles (chat web,
 * plus tard SMS, WhatsApp, Telegram) : jamais de Markdown visible.
 * Le modèle reçoit la consigne d'écrire en texte simple, et le code
 * nettoie quand même ce qu'il renvoie (le code décide, le modèle propose).
 */
export function toPlainText(input: string): string {
  let text = input.replace(/\r\n?/g, "\n");

  // Blocs de code ``` : garder le contenu, retirer les clôtures.
  text = text.replace(/```[a-zA-Z0-9_-]*\n?([\s\S]*?)```/g, (_m, code: string) => code.trim());

  // Images ![alt](url) → alt ; liens [texte](url) → texte (url).
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, url: string) =>
    label.trim() === url.trim() ? url : `${label} (${url})`,
  );

  const lines = text.split("\n").map((raw) => {
    let line = raw;
    // Titres « ## Menu » → « Menu ».
    line = line.replace(/^\s{0,3}#{1,6}\s+/, "");
    // Citations « > texte ».
    line = line.replace(/^\s{0,3}>\s?/, "");
    // Séparateurs --- / *** / ___ : supprimés.
    if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) return "";
    // Puces Markdown « - », « * », « + » → « • ».
    line = line.replace(/^(\s*)[-*+]\s+/, "$1• ");
    // Tableaux : « | a | b | » → « a · b » ; ligne d'alignement supprimée.
    if (/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(line)) return null;
    if (/^\s*\|.*\|\s*$/.test(line)) {
      line = line
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim())
        .filter(Boolean)
        .join(" · ");
    }
    return line;
  });

  text = lines.filter((l): l is string => l !== null).join("\n");

  // Gras / italique / barré / code en ligne (après le traitement des puces).
  text = text
    .replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, "$2")
    .replace(/(^|[^\w*])\*(?=\S)([^*\n]*?\S)\*(?!\w)/g, "$1$2")
    .replace(/(^|[^\w_])_(?=\S)([^_\n]*?\S)_(?!\w)/g, "$1$2")
    .replace(/~~(?=\S)([\s\S]*?\S)~~/g, "$1")
    .replace(/`([^`\n]+)`/g, "$1");

  // Échappements Markdown \* \_ \# … → caractère seul.
  text = text.replace(/\\([\\`*_{}[\]()#+\-.!|>~])/g, "$1");

  // Pas plus d'une ligne vide d'affilée, pas d'espaces en fin de ligne.
  return text
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
