# Jarvis-em

Express 5 + TypeScript REST API — calculator endpoint, strict type/lint tooling, Vitest tests, PostgreSQL via Docker.

**Stack:** TypeScript · Express 5 · Vitest · ESLint · Prettier · PostgreSQL (`pg`) · Docker Compose · GitHub Actions

---

## Features

| Feature                                     | Status  |
| ------------------------------------------- | ------- |
| REST API + calculator                       | Done    |
| Unit + API tests (Vitest, Supertest)        | Done    |
| PostgreSQL (Docker) + health checks         | Done    |
| Strict TS (`tsconfig` base / build / check) | Done    |
| ESLint + Prettier + `npm run check`         | Done    |
| CI (`.github/workflows/ci.yml`)             | Done    |
| Request logging to DB                       | Planned |

---

## Prerequisites

- **Node.js** 18+ and **npm**
- **Docker** — Postgres runs in Docker only (`docker info` to verify)

---

## Quick start

```bash
npm install
cp .env.example .env
npm run check          # typecheck + lint + format + tests (no Docker)
npm run db:up
npm run db:ping        # SELECT 1
npm run test:db        # CRUD smoke test
npm run dev            # http://localhost:3001
```

```bash
curl http://localhost:3001/health/db
curl -s -X POST http://localhost:3001/calculator \
  -H "Content-Type: application/json" \
  -d '{"operation":"add","a":2,"b":3}'
```

---

## Scripts

| Script                           | Purpose                                                  |
| -------------------------------- | -------------------------------------------------------- |
| `check`                          | **Main gate** — typecheck, lint, format check, app tests |
| `dev` / `start`                  | Run API (`tsx watch` / `tsx`)                            |
| `build` / `start:dist`           | Compile `src/` → `dist/`, run compiled                   |
| `typecheck`                      | `tsc` all `.ts` files (src, test, scripts, configs)      |
| `lint` / `lint:fix`              | ESLint (type-aware)                                      |
| `format` / `format:check`        | Prettier write / check                                   |
| `test` / `test:run`              | Vitest watch / run (app tests, no Docker)                |
| `test:db`                        | DB CRUD integration test (needs Postgres)                |
| `db:up` / `db:down` / `db:reset` | Start / stop / wipe Postgres                             |
| `db:ping` / `db:logs`            | CLI connectivity / container logs                        |

Default URL: `http://localhost:3001` — override with `PORT`.

---

## API

| Method | Path          | Response                                               |
| ------ | ------------- | ------------------------------------------------------ |
| GET    | `/`           | `{ "message": "Jarvis-em API" }`                       |
| GET    | `/health`     | `{ "status": "ok" }` — liveness, no DB                 |
| GET    | `/health/db`  | `{ "status": "ok", "database": "connected" }` or `503` |
| POST   | `/calculator` | See below                                              |

**POST `/calculator`**

```json
{ "operation": "add", "a": 2, "b": 3 }
```

| `operation` | `"add"` · `"subtract"` · `"multiply"` · `"divide"` |

**200:** `{ "operation", "a", "b", "result" }` · **400:** `{ "error": "Cannot divide by zero" }` · **400:** invalid body

---

## Configuration

```bash
cp .env.example .env
```

| Variable       | Default                                               | Notes                           |
| -------------- | ----------------------------------------------------- | ------------------------------- |
| `DATABASE_URL` | `postgresql://jarvis:jarvis@localhost:5433/jarvis_em` | Must match `docker-compose.yml` |
| `PORT`         | `3001`                                                | HTTP port                       |

Postgres: image `postgres:16`, host port **5433**, user/password/db `jarvis` / `jarvis` / `jarvis_em`.

---

## Project structure

```
src/
  server.ts          # Entry, graceful shutdown
  app.ts             # createApp() — routes + middleware
  calculator.ts      # Pure math logic
  routes/calculator.ts
  db/pool.ts         # pg Pool singleton
  db/ping.ts         # SELECT 1
  db/crudSmoke.ts    # Temp-table CRUD helper
test/                # Vitest (app + db.*.test.ts)
scripts/db-ping.ts   # CLI DB check
tsconfig.json        # Shared compiler rules
tsconfig.build.json  # src/ → dist/
tsconfig.check.json  # Full-repo typecheck
eslint.config.js     # ESLint flat config
.github/workflows/ci.yml
```

Imports use `.js` extensions (Node ESM / `NodeNext`).

---

## Testing

| Suite            | Command            | Docker |
| ---------------- | ------------------ | ------ |
| App (unit + API) | `npm run test:run` | No     |
| DB CRUD          | `npm run test:db`  | Yes    |

App tests use Supertest against `createApp()` — no running server. DB tests use a real pooled connection and a temp table.

New app tests: `test/myModule.test.ts` · DB tests: `test/db.*.test.ts` (picked up by `vitest.db.config.ts`).

---

## Tooling

- **TypeScript** — strict; `typecheck` covers src, test, scripts, vitest configs; `build` emits `dist/` from `src/` only
- **ESLint** — `typescript-eslint` strict type-checked rules
- **Prettier** — project-wide formatting; no conflict with ESLint
- **CI** — `npm run check` on push/PR to `main` (DB tests stay local)

Open in Cursor/VS Code — install recommended extensions (ESLint, Prettier); format-on-save enabled via `.vscode/settings.json`.

---

## Architecture

```
Client → app.ts → routes/calculator.ts → calculator.ts
                 → db/ping.ts → db/pool.ts → PostgreSQL (Docker)
Tests  → Supertest (app) · crudSmoke (db)
```

| Layer           | Role                            |
| --------------- | ------------------------------- |
| `server.ts`     | Boot, `.env`, pool shutdown     |
| `app.ts`        | HTTP wiring; exported for tests |
| `routes/`       | Request/response only           |
| `calculator.ts` | Domain logic, no HTTP/DB        |
| `db/`           | Pool, connectivity, CRUD smoke  |

---

## Troubleshooting

| Problem                       | Fix                                                               |
| ----------------------------- | ----------------------------------------------------------------- |
| Docker not running            | Start Docker Desktop → `npm run db:up`                            |
| `db:ping` fails after `db:up` | Wait for `healthy` in `docker compose ps`                         |
| Port 5433 in use              | Change Compose host port + `DATABASE_URL`                         |
| `/health/db` 503              | Check `DATABASE_URL`, Postgres up, `dotenv` loaded in `server.ts` |

---

## Roadmap

1. SQL migration — `request_logs` table
2. Middleware — persist GET/POST requests via `getPool()`
