import { describe, it, expect } from "vitest";
import {
  add,
  subtract,
  multiply,
  divide,
  DivisionByZeroError,
} from "../src/calculator.js";

describe("add", () => {
  it("adds two numbers", () => {
    expect(add(2, 3)).toBe(5);
  });

  it("handles decimals", () => {
    expect(add(0.1, 0.2)).toBeCloseTo(0.3);
  });

  it("handles negative numbers", () => {
    expect(add(-1, 1)).toBe(0);
  });
});

describe("subtract", () => {
  it("subtracts two numbers", () => {
    expect(subtract(10, 4)).toBe(6);
  });
});

describe("multiply", () => {
  it("multiplies two numbers", () => {
    expect(multiply(3, 4)).toBe(12);
  });
});

describe("divide", () => {
  it("divides two numbers", () => {
    expect(divide(10, 2)).toBe(5);
  });

  it("returns decimal results", () => {
    expect(divide(7, 2)).toBe(3.5);
  });

  it("throws DivisionByZeroError when divisor is 0", () => {
    expect(() => divide(1, 0)).toThrow(DivisionByZeroError);
  });
});
