import { getPool } from "./pool.js";

export interface CalculationResultRow {
  id: number;
  result: number;
}

export async function insertResult(result: number): Promise<number> {
  const { rows } = await getPool().query<{ id: string }>(
    `
    INSERT INTO calculation_results (result)
    VALUES ($1)
    RETURNING id
    `,
    [result],
  );

  const id = rows[0]?.id;
  if (id === undefined) {
    throw new Error("Failed to insert calculation result");
  }

  return Number(id);
}

export async function getResultById(id: number): Promise<number | null> {
  const { rows } = await getPool().query<{ result: string }>(
    `
    SELECT result
    FROM calculation_results
    WHERE id = $1
    `,
    [id],
  );

  const result = rows[0]?.result;
  return result === undefined ? null : Number(result);
}

export async function getAllResults(): Promise<CalculationResultRow[]> {
  const { rows } = await getPool().query<{ id: string; result: string }>(
    `
    SELECT id, result
    FROM calculation_results
    ORDER BY id ASC
    `,
  );

  return rows.map((row) => ({
    id: Number(row.id),
    result: Number(row.result),
  }));
}
