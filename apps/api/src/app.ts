import express from "express";
import cors from "cors";
import helmet from "helmet";
import visitRouter from "./routes/visits.js";
import statsRouter from "./routes/stats.js";


const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/visit", visitRouter);
app.use("/stats",statsRouter);

app.get("/", (_, res) => {
  res.json({
    status: "ok",
    message: "Analytics API"
  });
});

export default app;