import { describe, expect, it } from "vitest";
import { toPlainText } from "./plain-text";

describe("toPlainText : réponses sans Markdown", () => {
  it("retire gras, italique, code et titres", () => {
    expect(toPlainText("## Notre menu\n**Attiéké poulet** : *2 000 FCFA* `promo`")).toBe(
      "Notre menu\nAttiéké poulet : 2 000 FCFA promo",
    );
  });

  it("transforme les listes Markdown en puces simples", () => {
    expect(toPlainText("Voici :\n- Riz au gras\n* Alloco\n+ Frites")).toBe(
      "Voici :\n• Riz au gras\n• Alloco\n• Frites",
    );
  });

  it("garde les listes numérotées et les prix intacts", () => {
    expect(toPlainText("1. Attiéké 2 000 FCFA\n2. Alloco 1 500 FCFA")).toBe(
      "1. Attiéké 2 000 FCFA\n2. Alloco 1 500 FCFA",
    );
  });

  it("garde l'adresse d'un lien", () => {
    expect(toPlainText("Écrivez-nous sur [WhatsApp](https://wa.me/22890000000).")).toBe(
      "Écrivez-nous sur WhatsApp (https://wa.me/22890000000).",
    );
  });

  it("aplatit un tableau Markdown", () => {
    expect(toPlainText("| Plat | Prix |\n|---|---|\n| Alloco | 1 500 FCFA |")).toBe(
      "Plat · Prix\nAlloco · 1 500 FCFA",
    );
  });

  it("ne touche pas aux astérisques ni tirets qui ne sont pas du Markdown", () => {
    expect(toPlainText("Livraison 9h-22h, 2 x attiéké, total 4 500 FCFA.")).toBe(
      "Livraison 9h-22h, 2 x attiéké, total 4 500 FCFA.",
    );
    expect(toPlainText("Note : 5*3 = 15")).toBe("Note : 5*3 = 15");
  });

  it("supprime séparateurs, citations et lignes vides en trop", () => {
    expect(toPlainText("Bonjour\n\n\n---\n> Merci de patienter")).toBe("Bonjour\n\nMerci de patienter");
  });
});
