import { describe, it, expect } from "vitest";
import supertest from "supertest";
import { createApp } from "../src/app.js";

const app = createApp();

describe("POST /calculator", () => {
  it("adds two numbers", async () => {
    const res = await supertest(app)
      .post("/calculator")
      .send({ operation: "add", a: 2, b: 3 })
      .expect(200);

    expect(res.body.result).toBe(5);
  });

  it("subtracts two numbers", async () => {
    const res = await supertest(app)
      .post("/calculator")
      .send({ operation: "subtract", a: 10, b: 4 })
      .expect(200);

    expect(res.body.result).toBe(6);
  });

  it("multiplies two numbers", async () => {
    const res = await supertest(app)
      .post("/calculator")
      .send({ operation: "multiply", a: 3, b: 4 })
      .expect(200);

    expect(res.body.result).toBe(12);
  });

  it("divides two numbers", async () => {
    const res = await supertest(app)
      .post("/calculator")
      .send({ operation: "divide", a: 10, b: 2 })
      .expect(200);

    expect(res.body.result).toBe(5);
  });

  it("returns 400 when dividing by zero", async () => {
    const res = await supertest(app)
      .post("/calculator")
      .send({ operation: "divide", a: 10, b: 0 })
      .expect(400);

    expect(res.body.error).toBe("Cannot divide by zero");
  });
});
