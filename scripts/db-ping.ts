import "dotenv/config";
import { pingDb } from "../src/db/ping.js";
import { closePool } from "../src/db/pool.js";

const result = await pingDb();
await closePool();
if (result.ok) {
  console.log("Database OK");
  process.exit(0);
}
console.error("Database failed:", result.error);
process.exit(1);
