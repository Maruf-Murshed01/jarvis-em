import "dotenv/config";
import { createApp } from "./app.js";
import { closePool } from "./db/pool.js";
import { pingDb } from "./db/ping.js";

const PORT = Number(process.env.PORT) || 3001;
const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  void pingDb().then((result) => {
    if (result.ok) {
      console.log("Database connected");
    } else {
      console.log("Database unavailable:", result.error);
    }
  });
});

async function shutdown(signal: string) {
  console.log(`Shutting down (${signal})...`);
  await closePool();
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
