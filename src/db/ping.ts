import { getPool } from "./pool.js";

export type DbPingResult = { ok: true } | { ok: false; error: string };

export async function pingDb(): Promise<DbPingResult> {
  try {
    await getPool().query("SELECT 1");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function waitForDb({
  timeoutMs = 30_000,
  intervalMs = 500,
} = {}): Promise<DbPingResult> {
  const deadline = Date.now() + timeoutMs;
  let lastError = "Database not ready";
  while (Date.now() < deadline) {
    const result = await pingDb();
    if (result.ok) return result;
    lastError = result.error;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return { ok: false, error: lastError };
}
