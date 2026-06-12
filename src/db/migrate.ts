import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPool } from "./pool.js";

const migrationsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../db/migrations",
);

export type MigrationResult = { ok: true } | { ok: false; error: string };

function formatMigrationError(err: unknown): string {
  if (err instanceof AggregateError) {
    const details = err.errors
      .map((inner) => (inner instanceof Error ? inner.message : String(inner)))
      .filter(Boolean)
      .join("; ");
    return details || err.message || "Database connection failed";
  }

  if (err instanceof Error && err.message) {
    return err.message;
  }

  return String(err);
}

export async function runMigrations(): Promise<MigrationResult> {
  try {
    const sqlFiles = (await readdir(migrationsDir)).filter((name) => name.endsWith(".sql")).sort();

    for (const fileName of sqlFiles) {
      const filePath = path.join(migrationsDir, fileName);
      const sql = await readFile(filePath, "utf8");
      await getPool().query(sql);
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: formatMigrationError(err) };
  }
}
