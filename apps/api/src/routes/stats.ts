import { Router } from "express";
import { timingSafeEqual } from "node:crypto";
import prisma from "../config/prisma.js";

const router = Router();
router.use((req, res, next) => {
  const expected = process.env.DASHBOARD_TOKEN;
  if (!expected || expected.length < 24) return res.status(503).json({ error: "Defina DASHBOARD_TOKEN com pelo menos 24 caracteres no servidor" });
  const received = req.header("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return res.status(401).json({ error: "Acesso não autorizado" });
  next();
});

function source(utm: string | null, referrer: string | null): string {
  if (utm) return utm.trim().slice(0, 60) || "Direto";
  if (!referrer) return "Direto";
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host.includes("instagram.com")) return "Instagram";
    if (host.includes("facebook.com") || host.includes("fb.com")) return "Facebook";
    if (host.includes("google.")) return "Google";
    if (host.includes("vercel.com")) return "Vercel";
    return host.slice(0, 60);
  } catch { return "Outros"; }
}
router.get("/", async (req, res) => {
  try {
    const days = Number(req.query.days);
    const period = [7, 30, 90].includes(days) ? days : 30;
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - period + 1);
    const where = { startedAt: { gte: since } };
    const [visitors, sessions, mobile, desktop, countries, browsers, recent, rows] = await Promise.all([
      prisma.session.groupBy({ by: ["visitorId"], where }),
      prisma.session.count({ where }),
      prisma.session.count({ where: { ...where, deviceType: "Mobile" } }),
      prisma.session.count({ where: { ...where, deviceType: "Desktop" } }),
      prisma.session.groupBy({ by: ["country"], where, _count: { _all: true }, orderBy: { _count: { country: "desc" } }, take: 10 }),
      prisma.session.groupBy({ by: ["browser"], where, _count: { _all: true }, orderBy: { _count: { browser: "desc" } }, take: 10 }),
      prisma.session.findMany({ where, take: 50, orderBy: { startedAt: "desc" },
        select: { id: true, startedAt: true, country: true, region: true, city: true, browser: true, os: true, deviceType: true, language: true, durationMs: true, utmSource: true, referrer: true } }),
      prisma.session.findMany({ where, orderBy: { startedAt: "asc" }, select: { startedAt: true, utmSource: true, referrer: true } }),
    ]);
    const daily = new Map<string, number>();
    for (let i = 0; i < period; i++) {
      const day = new Date(since);
      day.setUTCDate(day.getUTCDate() + i);
      daily.set(day.toISOString().slice(0, 10), 0);
    }
    const origins = new Map<string, number>();
    for (const row of rows) {
      const day = row.startedAt.toISOString().slice(0, 10);
      daily.set(day, (daily.get(day) || 0) + 1);
      const name = source(row.utmSource, row.referrer);
      origins.set(name, (origins.get(name) || 0) + 1);
    }
    res.set("Cache-Control", "no-store");
    return res.json({
      period, visitors: visitors.length, sessions, mobile, desktop,
      countries: countries.map(c => ({ name: c.country || "Desconhecido", count: c._count._all })),
      browsers: browsers.map(b => ({ name: b.browser || "Desconhecido", count: b._count._all })),
      sources: Array.from(origins, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10),
      daily: Array.from(daily, ([date, count]) => ({ date, count })),
      recent,
    });
  } catch (error) {
    console.error("Erro em /stats", error);
    return res.status(500).json({ error: "Erro ao buscar estatísticas" });
  }
});
export default router;
