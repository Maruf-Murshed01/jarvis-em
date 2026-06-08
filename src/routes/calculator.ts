import { Router, type Request, type Response } from "express";
import { add, subtract, multiply, divide, DivisionByZeroError } from "../calculator.js";

type CalculatorOperation = "add" | "subtract" | "multiply" | "divide";

interface CalculatorRequestBody {
  operation: CalculatorOperation;
  a: number;
  b: number;
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

export const calculatorRouter = Router();

calculatorRouter.post("/", (req: Request, res: Response) => {
  if (!isCalculatorRequestBody(req.body)) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const { operation, a, b } = req.body;

  switch (operation) {
    case "add":
      return res.json({ operation, a, b, result: add(a, b) });
    case "subtract":
      return res.json({ operation, a, b, result: subtract(a, b) });
    case "multiply":
      return res.json({ operation, a, b, result: multiply(a, b) });
    case "divide":
      try {
        return res.json({ operation, a, b, result: divide(a, b) });
      } catch (err) {
        if (err instanceof DivisionByZeroError) {
          return res.status(400).json({ error: err.message });
        }
        throw err;
      }
  }
});
