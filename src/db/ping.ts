import { getPool } from "./pool.js";

export async function pingDb(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await getPool().query("SELECT 1");
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
