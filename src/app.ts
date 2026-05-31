import express, { type Request, type Response } from "express";

export function createApp(): express.Express {
  const app = express();

  app.use(express.json());

  app.get("/", (_req: Request, res: Response) => {
    res.json({ message: "Jarvis-em API" });
  });

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
  });

  return app;
}
