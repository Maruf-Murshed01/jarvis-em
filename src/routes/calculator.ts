import { Router, type Request, type Response } from "express";
import { add, subtract, multiply, divide, DivisionByZeroError } from "../calculator.js";
import { getAllResults, getResultById, insertResult } from "../db/calculationResults.js";

type CalculatorOperation = "add" | "subtract" | "multiply" | "divide";

interface CalculatorRequestBody {
  operation: CalculatorOperation;
  a: number;
  b: number;
}

interface CreateCalculatorRouterOptions {
  enableResultPersistence?: boolean;
}

function isCalculatorRequestBody(body: unknown): body is CalculatorRequestBody {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const { operation, a, b } = body as Record<string, unknown>;
  return (
    (operation === "add" ||
      operation === "subtract" ||
      operation === "multiply" ||
      operation === "divide") &&
    typeof a === "number" &&
    typeof b === "number"
  );
}

function parseIdParam(rawId: string): number | null {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

async function persistResult(
  result: number,
  enableResultPersistence: boolean,
): Promise<number | undefined> {
  if (!enableResultPersistence) {
    return undefined;
  }

  try {
    return await insertResult(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Calculation result persistence failed:", message);
    return undefined;
  }
}

export function createCalculatorRouter(options: CreateCalculatorRouterOptions = {}): Router {
  const enableResultPersistence = options.enableResultPersistence ?? true;
  const router = Router();

  router.get("/results", async (_req: Request, res: Response) => {
    if (!enableResultPersistence) {
      return res.json({ results: [] });
    }

    const results = await getAllResults();
    return res.json({ results });
  });

  router.get("/results/:id", async (req: Request, res: Response) => {
    if (!enableResultPersistence) {
      return res.status(404).json({ error: "Not found" });
    }

    const rawId = req.params.id;
    const id = parseIdParam(typeof rawId === "string" ? rawId : "");
    if (id === null) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const result = await getResultById(id);
    if (result === null) {
      return res.status(404).json({ error: "Not found" });
    }

    return res.json({ id, result });
  });

  router.post("/", async (req: Request, res: Response) => {
    if (!isCalculatorRequestBody(req.body)) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const { operation, a, b } = req.body;

    switch (operation) {
      case "add": {
        const result = add(a, b);
        const id = await persistResult(result, enableResultPersistence);
        return res.json(
          id === undefined ? { operation, a, b, result } : { operation, a, b, result, id },
        );
      }
      case "subtract": {
        const result = subtract(a, b);
        const id = await persistResult(result, enableResultPersistence);
        return res.json(
          id === undefined ? { operation, a, b, result } : { operation, a, b, result, id },
        );
      }
      case "multiply": {
        const result = multiply(a, b);
        const id = await persistResult(result, enableResultPersistence);
        return res.json(
          id === undefined ? { operation, a, b, result } : { operation, a, b, result, id },
        );
      }
      case "divide":
        try {
          const result = divide(a, b);
          const id = await persistResult(result, enableResultPersistence);
          return res.json(
            id === undefined ? { operation, a, b, result } : { operation, a, b, result, id },
          );
        } catch (err) {
          if (err instanceof DivisionByZeroError) {
            return res.status(400).json({ error: err.message });
          }
          throw err;
        }
    }
  });

  return router;
}
