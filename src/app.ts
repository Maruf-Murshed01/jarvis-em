import express, { type Express, type Request, type Response } from "express";
import { pingDb } from "./db/ping.js";
import { createCalculatorRouter } from "./routes/calculator.js";

export interface CreateAppOptions {
  /** Set to false in tests that should not touch the database. Defaults to true. */
  enableResultPersistence?: boolean;
}

export function createApp(options: CreateAppOptions = {}): Express {
  const shouldPersist = options.enableResultPersistence ?? true;

  const app = express();

  app.use(express.json());

  app.get("/", handleRoot);
  app.get("/health", handleHealth);
  app.get("/health/db", handleDbHealth);
  app.use("/calculator", createCalculatorRouter({ enableResultPersistence: shouldPersist }));
  app.use(handleNotFound);

  return app;
}

function handleRoot(_req: Request, res: Response): void {
  res.json({ message: "Jarvis-em API" });
}

function handleHealth(_req: Request, res: Response): void {
  res.json({ status: "ok" });
}

async function handleDbHealth(_req: Request, res: Response): Promise<void> {
  const result = await pingDb();

  if (!result.ok) {
    res.status(503).json({ database: "disconnected", error: result.error });
    return;
  }

  res.json({ status: "ok", database: "connected" });
}

function handleNotFound(_req: Request, res: Response): void {
  res.status(404).json({ error: "Not found" });
}
