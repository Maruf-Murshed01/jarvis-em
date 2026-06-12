import "dotenv/config";
import { runMigrations } from "../src/db/migrate.js";
import { waitForDb } from "../src/db/ping.js";
import { closePool } from "../src/db/pool.js";

const ready = await waitForDb();
if (!ready.ok) {
  console.error("Database not ready:", ready.error);
  await closePool();
  process.exit(1);
}

const result = await runMigrations();
await closePool();

if (result.ok) {
  console.log("Migrations OK");
  process.exit(0);
}

console.error("Migrations failed:", result.error);
process.exit(1);
