import { Router } from "express";
import prisma from "../config/prisma.js";

const router = Router();

router.get("/", async (_, res) => {
  try {
    const visitors = await prisma.visitor.count();

    const sessions = await prisma.session.count();

    const mobile = await prisma.session.count({
      where: {
        deviceType: "Mobile",
      },
    });

    const desktop = await prisma.session.count({
      where: {
        deviceType: "Desktop",
      },
    });

    return res.json({
      visitors,
      sessions,
      mobile,
      desktop,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao buscar estatísticas",
    });
  }
});

export default router;