/**
 * Protection de la clé Meta Model API sur les routes publiques.
 *
 * Trois compteurs, vérifiés AVANT tout appel au modèle :
 * - par session et par minute (un client qui mitraille),
 * - par adresse IP et par minute (plusieurs sessions, même connexion),
 * - par entreprise et par jour (plafond quotidien anti-explosion de coût).
 *
 * État en mémoire du processus : sur Vercel, chaque instance a son
 * propre compteur ; la limite est donc une borne par instance, pas
 * un compteur global partagé. C'est un garde-fou de coût, pas une
 * garantie comptable : il coupe l'abus évident dès la première
 * instance touchée. Les trois limites sont réglables par variables
 * d'environnement (voir .env.example).
 */

export interface ChatRateLimits {
  perMinuteSession: number;
  perMinuteIp: number;
  perDayBusiness: number;
}

export type RateLimitReason = "session" | "ip" | "business_daily";

export interface RateLimitVerdict {
  allowed: boolean;
  reason?: RateLimitReason;
  retryAfterSeconds?: number;
}

export interface ChatRateLimitKey {
  businessId: string;
  sessionId: string;
  ip: string;
}

const DEFAULTS: ChatRateLimits = {
  perMinuteSession: 12,
  perMinuteIp: 60,
  perDayBusiness: 1000,
};

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function chatRateLimitsFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): ChatRateLimits {
  return {
    perMinuteSession: positiveInt(
      env.CHAT_RATE_LIMIT_PER_MINUTE_SESSION,
      DEFAULTS.perMinuteSession,
    ),
    perMinuteIp: positiveInt(env.CHAT_RATE_LIMIT_PER_MINUTE_IP, DEFAULTS.perMinuteIp),
    perDayBusiness: positiveInt(env.CHAT_DAILY_LIMIT_PER_BUSINESS, DEFAULTS.perDayBusiness),
  };
}

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

export function createChatRateLimiter(limits: ChatRateLimits) {
  const minuteHits = new Map<string, number[]>();
  const dayHits = new Map<string, number[]>();

  function recordAndCount(
    map: Map<string, number[]>,
    key: string,
    now: number,
    windowMs: number,
  ): { count: number; oldest: number } {
    const cutoff = now - windowMs;
    const kept = (map.get(key) ?? []).filter((t) => t > cutoff);
    kept.push(now);
    map.set(key, kept);
    return { count: kept.length, oldest: kept[0] ?? now };
  }

  return {
    check(key: ChatRateLimitKey, now: number = Date.now()): RateLimitVerdict {
      const session = recordAndCount(
        minuteHits,
        `s:${key.businessId}:${key.sessionId}`,
        now,
        MINUTE_MS,
      );
      if (session.count > limits.perMinuteSession) {
        return {
          allowed: false,
          reason: "session",
          retryAfterSeconds: Math.max(1, Math.ceil((session.oldest + MINUTE_MS - now) / 1000)),
        };
      }
      const ip = recordAndCount(minuteHits, `i:${key.ip}`, now, MINUTE_MS);
      if (ip.count > limits.perMinuteIp) {
        return {
          allowed: false,
          reason: "ip",
          retryAfterSeconds: Math.max(1, Math.ceil((ip.oldest + MINUTE_MS - now) / 1000)),
        };
      }
      const day = recordAndCount(dayHits, `b:${key.businessId}`, now, DAY_MS);
      if (day.count > limits.perDayBusiness) {
        return {
          allowed: false,
          reason: "business_daily",
          retryAfterSeconds: Math.max(1, Math.ceil((day.oldest + DAY_MS - now) / 1000)),
        };
      }
      return { allowed: true };
    },
  };
}

/** Instance partagée du processus, limites lues dans l'environnement. */
export const chatRateLimiter = createChatRateLimiter(chatRateLimitsFromEnv());

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || "inconnue";
  return request.headers.get("x-real-ip")?.trim() || "inconnue";
}

export function rateLimitMessage(
  reason: RateLimitReason,
  texts: {
    rateLimitedSession: string;
    rateLimitedIp: string;
    rateLimitedBusiness: string;
  },
): string {
  if (reason === "session") return texts.rateLimitedSession;
  if (reason === "ip") return texts.rateLimitedIp;
  return texts.rateLimitedBusiness;
}
