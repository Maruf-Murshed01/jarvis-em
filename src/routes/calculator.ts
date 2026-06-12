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

// ============================================================================
// HELPERS
// ============================================================================

function isValidRequest(body: unknown): body is CalculatorRequestBody {
  if (typeof body !== "object" || body === null) return false;

  const { operation, a, b } = body as Record<string, unknown>;
  const validOps = ["add", "subtract", "multiply", "divide"];

  return validOps.includes(operation as string) && typeof a === "number" && typeof b === "number";
}

function isValidId(id: string): id is `${number}` {
  const num = Number(id);
  return Number.isInteger(num) && num > 0;
}

async function saveResult(result: number, shouldSave: boolean): Promise<number | undefined> {
  if (!shouldSave) return undefined;

  try {
    return await insertResult(result);
  } catch (error) {
    console.error("Failed to save result:", error);
    return undefined;
  }
}

function doCalculation(operation: CalculatorOperation, a: number, b: number): number {
  switch (operation) {
    case "add":
      return add(a, b);
    case "subtract":
      return subtract(a, b);
    case "multiply":
      return multiply(a, b);
    case "divide":
      return divide(a, b);
  }
}

// ============================================================================
// ROUTER
// ============================================================================

export function createCalculatorRouter(options: CreateCalculatorRouterOptions = {}): Router {
  const shouldPersist = options.enableResultPersistence ?? true;
  const router = Router();

  // GET /results
  // Returns all saved calculation results
  router.get("/results", async (req, res) => {
    if (!shouldPersist) {
      res.json({ results: [] });
      return;
    }

    const results = await getAllResults();
    res.json({ results });
  });

  // GET /results/:id
  // Returns a single calculation result by ID
  router.get("/results/:id", async (req, res) => {
    if (!shouldPersist) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const id = req.params.id;
    if (!isValidId(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const result = await getResultById(Number(id));
    if (result === null) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json({ id: Number(id), result });
  });

  // POST /
  // Performs a calculation with the given operation and operands
  router.post("/", async (req, res) => {
    if (!isValidRequest(req.body)) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const { operation, a, b } = req.body;

    try {
      const result = doCalculation(operation, a, b);
      const resultId = await saveResult(result, shouldPersist);

      const response = { operation, a, b, result };

      if (resultId !== undefined) {
        res.json({ ...response, id: resultId });
      } else {
        res.json(response);
      }
    } catch (error) {
      if (error instanceof DivisionByZeroError) {
        res.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  });

  return router;
}
