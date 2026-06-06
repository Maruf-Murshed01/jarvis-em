import express, { type Request, type Response } from "express";
import { pingDb } from "./db/ping.js";
import { calculatorRouter } from "./routes/calculator.js";

export function createApp(): express.Express {
  const app = express();

  app.use(express.json());

  app.get("/", (_req: Request, res: Response) => {
    res.json({ message: "Jarvis-em API" });
  });

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  app.get("/health/db", async (_req: Request, res: Response) => {
    const result = await pingDb();
    if (result.ok) {
      res.json({ status: "ok", database: "connected" });
      return;
    }
    res.status(503).json({ database: "disconnected", error: result.error });
  });

  app.use("/calculator", calculatorRouter);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
  });

  return app;
}
