import { Router } from "express";
import prisma from "../config/prisma.js";
import { getLocation } from "../geoip.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const data = req.body;

    const ip = req.ip === "::1" || req.ip === "127.0.0.1" ? "" : req.ip!;

    const location = await getLocation(ip);

    const visitor = await prisma.visitor.upsert({
      where: {
        visitorId: data.visitorId,
      },
      update: {
        visitCount: {
          increment: 1,
        },
      },
      create: {
        visitorId: data.visitorId,
      },
    });

    const session = await prisma.session.create({
      data: {
        visitorId: visitor.id,

        ip: ip,

        language: data.language,
        userAgent: data.userAgent,
        browser: data.browser,
        os: data.os,
        deviceType: data.deviceType,

        screenWidth: data.screenWidth,
        screenHeight: data.screenHeight,

        viewportWidth: data.viewportWidth,
        viewportHeight: data.viewportHeight,

        currentUrl: data.currentUrl,
        referrer: data.referrer,
        
        country: location?.country,
        region: location?.region,
        city: location?.city,
        timezone: location?.timezone,
      },
    });

    return res.status(201).json(session);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao registrar visita.",
    });
  }
});

export default router;
