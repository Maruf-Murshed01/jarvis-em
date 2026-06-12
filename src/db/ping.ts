import { getPool } from "./pool.js";

export type DbPingResult = { ok: true } | { ok: false; error: string };

function formatDbError(err: unknown): string {
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

export async function pingDb(): Promise<DbPingResult> {
  try {
    await getPool().query("SELECT 1");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: formatDbError(err) };
  }
}

export async function waitForDb(
  options: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<DbPingResult> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const intervalMs = options.intervalMs ?? 500;
  const deadline = Date.now() + timeoutMs;
  let lastError = "Database not ready";

  while (Date.now() < deadline) {
    const result = await pingDb();
    if (result.ok) {
      return { ok: true };
    }
    lastError = result.error;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return { ok: false, error: lastError };
}
