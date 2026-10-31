import { afterEach, describe, expect, it } from "vitest";
import { GET, POST } from "./route";

/**
 * Protection de la route appelée par le déclencheur externe
 * (cron-job.org toutes les minutes) : sans le secret, personne
 * ne déclenche l'envoi d'e-mails de secours.
 */
const original = process.env.CRON_SECRET;

afterEach(() => {
  if (original === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = original;
});

function request(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/cron/order-alerts", { headers });
}

describe("route cron des alertes", () => {
  it("503 explicite si CRON_SECRET n'est pas configuré", async () => {
    delete process.env.CRON_SECRET;
    const response = await GET(request({}));
    expect(response.status).toBe(503);
  });

  it("401 sans secret ou avec un mauvais secret", async () => {
    process.env.CRON_SECRET = "le-bon-secret";
    expect((await GET(request({}))).status).toBe(401);
    expect((await POST(request({ "x-cron-secret": "mauvais" }))).status).toBe(401);
    expect(
      (await GET(request({ authorization: "Bearer mauvais" }))).status,
    ).toBe(401);
  });
});
