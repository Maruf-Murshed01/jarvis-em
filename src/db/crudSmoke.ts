import { getPool } from "./pool.js";

export async function runCrudSmoke(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const client = await getPool().connect();
  try {
    await client.query(
      "CREATE TEMP TABLE pg_crud_smoke (id SERIAL PRIMARY KEY, label TEXT NOT NULL)",
    );

    const insert = await client.query<{ id: number }>(
      "INSERT INTO pg_crud_smoke (label) VALUES ($1) RETURNING id",
      ["before"],
    );
    const id = insert.rows[0]?.id;
    if (id === undefined) {
      return { ok: false, error: "INSERT did not return an id" };
    }

    const select = await client.query<{ label: string }>(
      "SELECT label FROM pg_crud_smoke WHERE id = $1",
      [id],
    );
    if (select.rows[0]?.label !== "before") {
      return { ok: false, error: "SELECT returned unexpected label" };
    }

    const update = await client.query<{ label: string }>(
      "UPDATE pg_crud_smoke SET label = $1 WHERE id = $2 RETURNING label",
      ["after", id],
    );
    if (update.rows[0]?.label !== "after") {
      return { ok: false, error: "UPDATE did not persist" };
    }

    const del = await client.query<{ id: number }>(
      "DELETE FROM pg_crud_smoke WHERE id = $1 RETURNING id",
      [id],
    );
    if (del.rows[0]?.id !== id) {
      return { ok: false, error: "DELETE did not return expected id" };
    }

    const count = await client.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM pg_crud_smoke",
    );
    if (count.rows[0]?.count !== "0") {
      return { ok: false, error: "Row count is not zero after DELETE" };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  } finally {
    client.release();
  }
}
