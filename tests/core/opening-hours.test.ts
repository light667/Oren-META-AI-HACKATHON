import { describe, expect, it } from "vitest";
import { getBusinessOpenStatus, parseHourRanges } from "@/lib/opening-hours";

describe("Calcul d'ouverture d'entreprise (Tâche D5)", () => {
  const standardHours = {
    lundi: "10h-22h",
    mardi: "10h-22h",
    mercredi: "10h-22h",
    jeudi: "10h-22h",
    vendredi: "10h-00h", // minuit
    samedi: "18h-02h",  // traverse minuit vers dimanche
    dimanche: "fermé",
  };

  it("gère les heures limites : début inclus, fin exclue", () => {
    // Un lundi à 10h00 heure de Lomé (UTC)
    const at10h00 = new Date("2026-10-26T10:00:00Z");
    expect(getBusinessOpenStatus(standardHours, "Africa/Lome", at10h00).isOpen).toBe(true);

    // Un lundi à 09h59 heure de Lomé
    const at09h59 = new Date("2026-10-26T09:59:00Z");
    expect(getBusinessOpenStatus(standardHours, "Africa/Lome", at09h59).isOpen).toBe(false);

    // Un lundi à 21h59 heure de Lomé
    const at21h59 = new Date("2026-10-26T21:59:00Z");
    expect(getBusinessOpenStatus(standardHours, "Africa/Lome", at21h59).isOpen).toBe(true);

    // Un lundi à 22h00 heure de Lomé (heure limite = fermé)
    const at22h00 = new Date("2026-10-26T22:00:00Z");
    expect(getBusinessOpenStatus(standardHours, "Africa/Lome", at22h00).isOpen).toBe(false);
  });

  it("gère la fermeture à minuit (00h / 24h)", () => {
    // Vendredi 23h59 à Lomé
    const fri23h59 = new Date("2026-10-30T23:59:00Z");
    expect(getBusinessOpenStatus(standardHours, "Africa/Lome", fri23h59).isOpen).toBe(true);

    // Samedi 00h00 à Lomé (minuit passé)
    const sat00h00 = new Date("2026-10-31T00:00:00Z");
    expect(getBusinessOpenStatus(standardHours, "Africa/Lome", sat00h00).isOpen).toBe(false);
  });

  it("gère les plages qui traversent minuit vers le lendemain matin", () => {
    // Samedi 23h00 (ouvert)
    const sat23h00 = new Date("2026-10-31T23:00:00Z");
    expect(getBusinessOpenStatus(standardHours, "Africa/Lome", sat23h00).isOpen).toBe(true);

    // Dimanche 01h30 (ouvert grâce à la nuit de samedi)
    const sun01h30 = new Date("2026-11-01T01:30:00Z");
    expect(getBusinessOpenStatus(standardHours, "Africa/Lome", sun01h30).isOpen).toBe(true);

    // Dimanche 02h00 (fermé)
    const sun02h00 = new Date("2026-11-01T02:00:00Z");
    expect(getBusinessOpenStatus(standardHours, "Africa/Lome", sun02h00).isOpen).toBe(false);
  });

  it("gère les jours fermés", () => {
    // Dimanche après-midi 15h00 (fermé)
    const sun15h00 = new Date("2026-11-01T15:00:00Z");
    const status = getBusinessOpenStatus(standardHours, "Africa/Lome", sun15h00);
    expect(status.isOpen).toBe(false);
    expect(status.todayHours).toBe("fermé");
  });

  it("gère le format ouvert 24h/24 tous les jours", () => {
    const seedHours = {
      lundi: "24h/24",
      mardi: "24h/24",
      mercredi: "24h/24",
      jeudi: "24h/24",
      vendredi: "24h/24",
      samedi: "24h/24",
      dimanche: "24h/24",
    };

    // N'importe quel jour et heure doit être ouvert
    expect(getBusinessOpenStatus(seedHours, "Africa/Lome", new Date("2026-11-01T03:33:00Z")).isOpen).toBe(true);
    expect(getBusinessOpenStatus(seedHours, "Africa/Lome", new Date("2026-11-01T12:00:00Z")).isOpen).toBe(true);
    expect(getBusinessOpenStatus(seedHours, "Africa/Lome", new Date("2026-11-01T23:59:00Z")).isOpen).toBe(true);
  });

  it("respecte le fuseau horaire de l'entreprise et non celui du serveur", () => {
    // 21h00 UTC = 21h00 à Lomé (ouvert, 10h-22h)
    // mais à Tokyo (UTC+9), il est 06h00 le lendemain (fermé)
    const at21h00Utc = new Date("2026-10-26T21:00:00Z");
    expect(getBusinessOpenStatus(standardHours, "Africa/Lome", at21h00Utc).isOpen).toBe(true);
    expect(getBusinessOpenStatus(standardHours, "Asia/Tokyo", at21h00Utc).isOpen).toBe(false);
  });

  it("parseHourRanges identifie 24h, fermé et les plages", () => {
    expect(parseHourRanges("24h/24").is24h).toBe(true);
    expect(parseHourRanges("fermé").isClosed).toBe(true);
    expect(parseHourRanges("10h-22h").ranges).toEqual([[600, 1320]]);
  });
});

