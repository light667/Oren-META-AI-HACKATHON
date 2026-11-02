/**
 * Calcul d'ouverture / fermeture d'une entreprise (Tâche D5 / docs/DESIGN.md).
 *
 * Utilise toujours le fuseau horaire de l'entreprise (défaut : Africa/Lome),
 * jamais celui du serveur ni du navigateur.
 * Respecte les heures limites (début inclus, fin exclue), minuit,
 * les plages traversant minuit, les jours fermés et le 24 h/24.
 */

const DAY_EN_TO_FR: Record<string, string> = {
  sunday: "dimanche",
  monday: "lundi",
  tuesday: "mardi",
  wednesday: "mercredi",
  thursday: "jeudi",
  friday: "vendredi",
  saturday: "samedi",
};

const PREV_DAY: Record<string, string> = {
  dimanche: "samedi",
  lundi: "dimanche",
  mardi: "lundi",
  mercredi: "mardi",
  jeudi: "mercredi",
  vendredi: "jeudi",
  samedi: "vendredi",
};

export interface OpenStatusResult {
  isOpen: boolean;
  todayHours: string | null;
}

/**
 * Extrait l'heure locale (minutes depuis minuit et jour en français)
 * dans le fuseau horaire demandé.
 */
export function getLocalTime(
  date: Date,
  timezone: string = "Africa/Lome",
): { dayKey: string; minutes: number } {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "long",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    });
    const parts = formatter.formatToParts(date);
    let weekdayStr = "monday";
    let hour = 0;
    let minute = 0;
    for (const part of parts) {
      if (part.type === "weekday") weekdayStr = part.value.toLowerCase();
      if (part.type === "hour") hour = parseInt(part.value, 10);
      if (part.type === "minute") minute = parseInt(part.value, 10);
    }
    if (hour === 24) hour = 0;
    const dayKey = DAY_EN_TO_FR[weekdayStr] ?? "lundi";
    return { dayKey, minutes: hour * 60 + minute };
  } catch {
    return getLocalTime(date, "Africa/Lome");
  }
}

/**
 * Analyse une chaîne d'horaire d'un jour (ex: "10h-22h", "10h30-14h30, 18h-02h", "24h/24").
 * Retourne la liste des plages [startMin, endMin].
 */
export function parseHourRanges(
  hoursStr: string,
): { is24h: boolean; isClosed: boolean; ranges: [number, number][] } {
  const str = hoursStr.trim().toLowerCase();
  if (!str || /ferm[eé]/i.test(str)) {
    return { is24h: false, isClosed: true, ranges: [] };
  }
  if (/24\s*h?\s*\/\s*24/i.test(str) || /00?h\s*[-–]\s*24h/i.test(str)) {
    return { is24h: true, isClosed: false, ranges: [[0, 1440]] };
  }

  const ranges: [number, number][] = [];
  // Reconnaît 10h-22h, 10h30-22h00, 10:00-22:00, 10h - 00h
  const pattern = /(\d{1,2})(?:h(\d{1,2})?|:(\d{1,2}))?\s*[-–]\s*(\d{1,2})(?:h(\d{1,2})?|:(\d{1,2}))?/gi;
  let match;
  while ((match = pattern.exec(str)) !== null) {
    const startH = parseInt(match[1], 10);
    const startM = match[2] ? parseInt(match[2], 10) : match[3] ? parseInt(match[3], 10) : 0;
    const endH = parseInt(match[4], 10);
    const endM = match[5] ? parseInt(match[5], 10) : match[6] ? parseInt(match[6], 10) : 0;

    const startTotal = startH * 60 + startM;
    let endTotal = endH * 60 + endM;

    // "00h" ou "24h" en fin de plage = minuit (1440 min)
    if (endH === 0 && endM === 0 && startTotal > 0) {
      endTotal = 1440;
    } else if (endH === 24) {
      endTotal = 1440;
    }

    ranges.push([startTotal, endTotal]);
  }

  return { is24h: false, isClosed: ranges.length === 0, ranges };
}

/**
 * Calcule le statut ouvert/fermé selon les horaires configurés et le fuseau.
 */
export function getBusinessOpenStatus(
  openingHours: Record<string, string>,
  timezone: string = "Africa/Lome",
  now: Date = new Date(),
): OpenStatusResult {
  const { dayKey, minutes } = getLocalTime(now, timezone);
  const todayStr = openingHours[dayKey] ?? null;

  // 1. Vérifier la journée en cours
  if (todayStr) {
    const { is24h, isClosed, ranges } = parseHourRanges(todayStr);
    if (is24h) return { isOpen: true, todayHours: todayStr };
    if (!isClosed) {
      for (const [start, end] of ranges) {
        if (end > start) {
          // Plage standard dans la même journée : début inclus, fin exclue
          if (minutes >= start && minutes < end) {
            return { isOpen: true, todayHours: todayStr };
          }
        } else {
          // Plage traversant minuit (ex: 18h - 02h) : après le début
          if (minutes >= start) {
            return { isOpen: true, todayHours: todayStr };
          }
        }
      }
    }
  }

  // 2. Vérifier si une plage de la veille traverse minuit vers aujourd'hui
  const prevDayKey = PREV_DAY[dayKey];
  const prevStr = openingHours[prevDayKey] ?? null;
  if (prevStr) {
    const { ranges } = parseHourRanges(prevStr);
    for (const [start, end] of ranges) {
      if (end < start && minutes < end) {
        // La plage d'hier court jusqu'à `end` aujourd'hui
        return { isOpen: true, todayHours: todayStr };
      }
    }
  }

  return { isOpen: false, todayHours: todayStr };
}
