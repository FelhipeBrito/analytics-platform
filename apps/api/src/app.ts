import express from "express";
import cors from "cors";
import helmet from "helmet";
import visitRouter from "./routes/visits.js";
import statsRouter from "./routes/stats.js";

const app = express();
const allowed = (process.env.ALLOWED_ORIGINS || "https://analytics-platform-landing.vercel.app,http://localhost:5173,http://localhost:5174").split(",").map(s => s.trim()).filter(Boolean);
const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
if (Number.isInteger(proxyHops) && proxyHops > 0 && proxyHops <= 5) app.set("trust proxy", proxyHops);

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin(origin, cb) {
  if (!origin || allowed.includes(origin)) return cb(null, true);
  return cb(new Error("Origin not allowed"));
}}));
app.use(express.json({ limit: "12kb" }));

app.use("/visit", visitRouter);
app.use("/stats", statsRouter);
app.get("/", (_, res) => res.json({ status: "ok", message: "Analytics API" }));
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof Error && err.message === "Origin not allowed") return res.status(403).json({ error: "Origem não permitida" });
  return res.status(400).json({ error: "Requisição inválida" });
});
export default app;
