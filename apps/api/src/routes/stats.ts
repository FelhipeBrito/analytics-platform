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
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    // Diagnóstico temporário: registra apenas metadados, nunca os valores dos segredos.
    // Remover após solucionar a configuração do Render.
    console.warn("[stats-auth] token rejeitado", {
      expectedLength: a.length,
      receivedLength: b.length,
      authorizationPresent: Boolean(req.header("authorization")),
      bearerFormat: /^Bearer\\s+\\S+$/i.test(req.header("authorization") || ""),
      expectedHasOuterWhitespace: expected !== expected.trim(),
      receivedHasOuterWhitespace: received !== received.trim(),
      sameByteLength: a.length === b.length,
    });
    return res.status(401).json({ error: "Acesso não autorizado" });
  }
  next();
});
router.get("/", async (_req, res) => {
  try {
    const [visitors, sessions, mobile, desktop, countries, recent] = await Promise.all([
      prisma.visitor.count(),
      prisma.session.count(),
      prisma.session.count({ where: { deviceType: "Mobile" } }),
      prisma.session.count({ where: { deviceType: "Desktop" } }),
      prisma.session.groupBy({ by: ["country"], _count: { _all: true }, orderBy: { _count: { country: "desc" } }, take: 8 }),
      prisma.session.findMany({
        take: 30, orderBy: { startedAt: "desc" },
        select: { id: true, startedAt: true, country: true, region: true, city: true, browser: true, os: true, deviceType: true, language: true, durationMs: true, utmSource: true, referrer: true },
      }),
    ]);
    res.set("Cache-Control", "no-store");
    return res.json({ visitors, sessions, mobile, desktop, countries: countries.map(c => ({ name: c.country || "Desconhecido", count: c._count._all })), recent });
  } catch (error) {
    console.error("Erro em /stats", error);
    return res.status(500).json({ error: "Erro ao buscar estatísticas" });
  }
});
export default router;
