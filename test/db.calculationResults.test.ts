import "dotenv/config";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import supertest from "supertest";
import { createApp } from "../src/app.js";
import { runMigrations } from "../src/db/migrate.js";
import { getPool, closePool } from "../src/db/pool.js";

const app = createApp({ enableResultPersistence: true });

interface CalculationResultRow {
  id: number;
  result: number;
}

async function fetchAllResults(): Promise<CalculationResultRow[]> {
  const { rows } = await getPool().query<{ id: string; result: string }>(
    `SELECT id, result FROM calculation_results ORDER BY id`,
  );

  return rows.map((row) => ({
    id: Number(row.id),
    result: Number(row.result),
  }));
}

beforeAll(async () => {
  const result = await runMigrations();
  expect(result).toEqual({ ok: true });
});

beforeEach(async () => {
  await getPool().query("TRUNCATE calculation_results RESTART IDENTITY");
});

afterAll(async () => {
  await closePool();
});

describe("calculation result storage", () => {
  it("saves the result of a successful POST add", async () => {
    const res = await supertest(app)
      .post("/calculator")
      .send({ operation: "add", a: 2, b: 3 })
      .expect(200);

    expect(res.body).toMatchObject({ result: 5, id: 1 });

    const rows = await fetchAllResults();
    expect(rows).toEqual([{ id: 1, result: 5 }]);
  });

  it("assigns incrementing ids for multiple successful POSTs", async () => {
    await supertest(app).post("/calculator").send({ operation: "add", a: 2, b: 3 }).expect(200);

    const res = await supertest(app)
      .post("/calculator")
      .send({ operation: "subtract", a: 10, b: 4 })
      .expect(200);

    expect(res.body).toMatchObject({ result: 6, id: 2 });

    const rows = await fetchAllResults();
    expect(rows).toEqual([
      { id: 1, result: 5 },
      { id: 2, result: 6 },
    ]);
  });

  it("does not save a row when dividing by zero", async () => {
    await supertest(app).post("/calculator").send({ operation: "divide", a: 10, b: 0 }).expect(400);

    const rows = await fetchAllResults();
    expect(rows).toEqual([]);
  });

  it("does not save a row for an invalid request body", async () => {
    await supertest(app).post("/calculator").send({ operation: "add", a: "x" }).expect(400);

    const rows = await fetchAllResults();
    expect(rows).toEqual([]);
  });

  it("lists all stored results", async () => {
    await supertest(app).post("/calculator").send({ operation: "add", a: 2, b: 3 }).expect(200);
    await supertest(app)
      .post("/calculator")
      .send({ operation: "subtract", a: 10, b: 4 })
      .expect(200);

    const res = await supertest(app).get("/calculator/results").expect(200);

    expect(res.body.results).toEqual([
      { id: 1, result: 5 },
      { id: 2, result: 6 },
    ]);
  });

  it("returns a stored result by id", async () => {
    await supertest(app).post("/calculator").send({ operation: "add", a: 2, b: 3 }).expect(200);

    const res = await supertest(app).get("/calculator/results/1").expect(200);

    expect(res.body).toEqual({ id: 1, result: 5 });
  });

  it("returns 404 for a missing result id", async () => {
    const res = await supertest(app).get("/calculator/results/999").expect(404);

    expect(res.body.error).toBe("Not found");
  });

  it("returns 400 for a non-numeric result id", async () => {
    const res = await supertest(app).get("/calculator/results/abc").expect(400);

    expect(res.body.error).toBe("Invalid id");
  });
});
