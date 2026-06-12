-- Stores only the numeric result of successful calculator operations.
-- IF NOT EXISTS = safe to re-run via npm run db:migrate

CREATE TABLE IF NOT EXISTS calculation_results (
  id     BIGSERIAL PRIMARY KEY,
  result DOUBLE PRECISION NOT NULL
);
