import { Router, type Request, type Response } from "express";
import {
  add,
  subtract,
  multiply,
  divide,
  DivisionByZeroError,
} from "../calculator.js";

export const calculatorRouter = Router();

calculatorRouter.post("/", (req: Request, res: Response) => {
  const { operation, a, b } = req.body;

  if (operation === "add") {
    return res.json({ operation, a, b, result: add(a, b) });
  }

  if (operation === "subtract") {
    return res.json({ operation, a, b, result: subtract(a, b) });
  }

  if (operation === "multiply") {
    return res.json({ operation, a, b, result: multiply(a, b) });
  }

  if (operation === "divide") {
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
