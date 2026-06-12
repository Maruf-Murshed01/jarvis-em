import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPool } from "./pool.js";

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../db/migrations");

export type MigrationResult = { ok: true } | { ok: false; error: string };

export async function runMigrations(): Promise<MigrationResult> {
  try {
    const sqlFiles = (await readdir(migrationsDir)).filter((n) => n.endsWith(".sql")).sort();
    for (const file of sqlFiles) {
      await getPool().query(await readFile(path.join(migrationsDir, file), "utf8"));
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
