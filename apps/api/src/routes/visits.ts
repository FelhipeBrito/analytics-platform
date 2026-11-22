import { Router } from "express";
import prisma from "../config/prisma.js";
import { getLocation } from "../geoip.js";

const router = Router();
const hits = new Map<string, { count: number; reset: number }>();
const LIMIT = 35;
function limited(ip: string): boolean {
  const now = Date.now();
  if (hits.size > 5000) for (const [key, item] of hits) if (item.reset < now) hits.delete(key);
  const current = hits.get(ip);
  if (!current || current.reset < now) { hits.set(ip, { count: 1, reset: now + 60000 }); return false; }
  current.count++;
  return current.count > LIMIT;
}
function short(value: unknown, max = 255): string | undefined {
  return typeof value === "string" ? value.slice(0, max) : undefined;
}
function positive(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 20000 ? value : undefined;
}
function cleanUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 2048) return undefined;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return undefined;
    return url.origin + url.pathname.slice(0, 500);
  } catch { return undefined; }
}
router.post("/", async (req, res) => {
  const ip = req.ip || "";
  if (limited(ip)) return res.status(429).json({ error: "Limite de requisições atingido" });
  const data = req.body;
  if (!data || typeof data !== "object" || Array.isArray(data) || typeof data.visitorId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.visitorId)) {
    return res.status(400).json({ error: "Identificador inválido" });
  }
  try {
    const location = await getLocation(ip);
    const visitor = await prisma.visitor.upsert({
      where: { visitorId: data.visitorId },
      update: { visitCount: { increment: 1 } },
      create: { visitorId: data.visitorId },
    });
    const currentUrl = cleanUrl(data.currentUrl);
    const referrer = cleanUrl(data.referrer);
    const session = await prisma.session.create({
      data: {
        visitorId: visitor.id,
        // IP bruto não é persistido: somente a localização aproximada.
        language: short(data.language, 40),
        userAgent: short(data.userAgent, 600),
        browser: short(data.browser, 100),
        browserVersion: short(data.browserVersion, 40),
        os: short(data.os, 100),
        deviceType: ["Mobile", "Desktop", "Tablet"].includes(data.deviceType) ? data.deviceType : "Unknown",
        screenWidth: positive(data.screenWidth),
        screenHeight: positive(data.screenHeight),
        viewportWidth: positive(data.viewportWidth),
        viewportHeight: positive(data.viewportHeight),
        currentUrl,
        referrer,
        country: location?.country,
        region: location?.region,
        city: location?.city,
        timezone: location?.timezone,
        utmSource: short(data.utmSource, 100),
        utmMedium: short(data.utmMedium, 100),
        utmCampaign: short(data.utmCampaign, 100),
      },
    });
    return res.status(201).json({ sessionId: session.id });
  } catch (error) {
    console.error("Erro ao registrar visita", error);
    return res.status(500).json({ error: "Erro ao registrar visita" });
  }
});
router.post("/:sessionId/end", async (req, res) => {
  const { sessionId } = req.params;
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return res.status(400).json({ error: "Sessão inválida" });
  const duration = req.body?.durationMs;
  if (typeof duration !== "number" || !Number.isInteger(duration) || duration < 0 || duration > 86400000) return res.status(400).json({ error: "Duração inválida" });
  if (limited(req.ip || "")) return res.status(429).json({ error: "Limite atingido" });
  try {
    await prisma.session.updateMany({ where: { id: sessionId, endedAt: null }, data: { endedAt: new Date(), durationMs: duration } });
    return res.status(204).end();
  } catch { return res.status(500).json({ error: "Erro ao finalizar sessão" }); }
});
export default router;
