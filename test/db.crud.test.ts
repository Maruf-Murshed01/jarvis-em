import "dotenv/config";
import { describe, it, expect, afterAll } from "vitest";
import { runCrudSmoke } from "../src/db/crudSmoke.js";
import { closePool } from "../src/db/pool.js";

describe("postgres crud smoke", () => {
  afterAll(async () => {
    await closePool();
  });

  it("runs insert, select, update, delete on a temp table", async () => {
    const result = await runCrudSmoke();
    expect(result).toEqual({ ok: true });
  });
});
