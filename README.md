# Jarvis-em

TypeScript REST API built with Express 5. Exposes a calculator endpoint and persists successful calculation results to PostgreSQL.

## Table of contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [API reference](#api-reference)
- [Database](#database)
- [Development](#development)
- [Project structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Overview

Jarvis-em is a small, production-style API service with:

- A **calculator** endpoint supporting `add`, `subtract`, `multiply`, and `divide`
- **Result persistence** — successful calculations are stored as `{ id, result }` in Postgres
- **Health checks** — liveness (`/health`) and database connectivity (`/health/db`)
- **Quality tooling** — strict TypeScript, ESLint, Prettier, Vitest, and GitHub Actions CI

Persistence is intentionally minimal: only the numeric result is saved on success. Failed requests and non-calculator traffic are not stored.

## Architecture

Jarvis-em is a small layered API: Express handles HTTP, route handlers orchestrate validation and persistence, pure functions do the math, and a thin database layer talks to PostgreSQL.

### How it fits together

```
┌─────────────┐     HTTP      ┌──────────────────────────────────────────┐
│   Client    │ ────────────► │  server.ts                               │
│ (curl, app) │               │  loads .env, starts Express, shuts down DB │
└─────────────┘               └──────────────────┬───────────────────────┘
                                                 │
                                                 ▼
                              ┌──────────────────────────────────────────┐
                              │  app.ts (createApp)                      │
                              │  express.json() + route wiring           │
                              └──────────────────┬───────────────────────┘
                                                 │
           ┌─────────────────────────────────────┼─────────────────────────────┐
           │                                     │                             │
           ▼                                     ▼                             ▼
    GET /, /health                    GET /health/db              /calculator/*
    (in app.ts)                       pingDb()                    routes/calculator.ts
                                      via pool.ts                 │
                                                                  │
                    ┌─────────────────────────────────────────────┼──────────────────┐
                    │                                             │                  │
                    ▼                                             ▼                  ▼
             POST /calculator                          GET /results        GET /results/:id
             validate body                             list rows           fetch one row
             calculator.ts (math)                      calculationResults  calculationResults
             save on success ─────────────────────────► insertResult / getAll / getById
                                                                  │
                                                                  ▼
                                                         pool.ts (pg Pool)
                                                                  │
                                                                  ▼
                                              PostgreSQL — calculation_results
                                              (id, result)
```

### Request lifecycle: calculate and store

1. **Boot** — `server.ts` loads environment variables, builds the app with `createApp()`, and listens on `PORT`. On startup it pings the database and logs whether Postgres is reachable.
2. **Parse** — `express.json()` turns the request body into a JavaScript object.
3. **Validate** — The calculator router checks that `operation` is one of `add`, `subtract`, `multiply`, or `divide`, and that `a` and `b` are numbers. Bad input returns `400` without touching the database.
4. **Calculate** — `src/calculator.ts` runs the operation. It has no knowledge of HTTP or Postgres. Division by zero throws `DivisionByZeroError`, which the router maps to `400`.
5. **Persist** — On success, `insertResult()` writes only the numeric `result` to `calculation_results` and returns the new row `id`. If persistence is disabled (tests) or the insert fails, the API still returns the calculation but may omit `id` (fail-open).
6. **Respond** — JSON includes `operation`, `a`, `b`, `result`, and optionally `id`.

Read paths (`GET /calculator/results` and `GET /calculator/results/:id`) skip the calculator and query Postgres directly through the same DB layer.

### Layers and responsibilities

| Layer          | Files                                                | Role                                                                       |
| -------------- | ---------------------------------------------------- | -------------------------------------------------------------------------- |
| Entry          | `src/server.ts`                                      | Process entry, graceful shutdown, closes the connection pool               |
| HTTP shell     | `src/app.ts`                                         | Express setup, health routes, mounts calculator router; exported for tests |
| Routes         | `src/routes/calculator.ts`                           | Request validation, HTTP status codes, calls math + DB                     |
| Domain         | `src/calculator.ts`                                  | Pure arithmetic; no I/O                                                    |
| Database       | `src/db/pool.ts`, `calculationResults.ts`, `ping.ts` | Connection pool, CRUD queries, connectivity checks                         |
| Schema         | `db/migrations/`                                     | SQL applied by `npm run db:migrate`                                        |
| Infrastructure | `docker-compose.yml`                                 | Local Postgres for development                                             |

### What connects to what

- **Tests without Docker** — `createApp({ enableResultPersistence: false })` skips all DB calls; calculator math and HTTP behavior are tested with Supertest.
- **Tests with Docker** — DB integration tests use a real Postgres instance and exercise `insertResult`, `getAllResults`, and `getResultById` end to end.
- **Health** — `/health` is a simple liveness check (no DB). `/health/db` uses the same `pingDb()` helper as startup and migration scripts.

Persistence is deliberately narrow: operands and operation names are not stored—only the successful numeric result.

## Tech stack

| Layer         | Technology           |
| ------------- | -------------------- |
| Runtime       | Node.js 18+          |
| Language      | TypeScript (strict)  |
| HTTP          | Express 5            |
| Database      | PostgreSQL 16 (`pg`) |
| Local DB      | Docker Compose       |
| Testing       | Vitest, Supertest    |
| Lint / format | ESLint, Prettier     |
| CI            | GitHub Actions       |

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- [npm](https://www.npmjs.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for PostgreSQL)

Verify Docker is running:

```bash
docker info
```

## Getting started

### 1. Clone and install

```bash
git clone <repository-url>
cd Jarvis-em
npm install
cp .env.example .env
```

### 2. Run the quality gate (no Docker required)

```bash
npm run check
```

Runs typecheck, lint, format check, and unit/API tests.

### 3. Start the database

```bash
npm run db:up        # starts Postgres and waits until healthy
npm run db:migrate   # applies SQL migrations
npm run db:ping      # expect: Database OK
```

### 4. Run DB integration tests (optional)

```bash
npm run test:db
```

### 5. Start the API

```bash
npm run dev
```

The server listens on `http://localhost:3001` by default.

### 6. Send a request

```bash
# Calculate
curl -s -X POST http://localhost:3001/calculator \
  -H "Content-Type: application/json" \
  -d '{"operation":"add","a":2,"b":5}'

# List stored results
curl -s http://localhost:3001/calculator/results

# Fetch result by id
curl -s http://localhost:3001/calculator/results/1
```

Inspect rows directly in Postgres:

```bash
docker compose exec postgres psql -U jarvis -d jarvis_em \
  -c "SELECT id, result FROM calculation_results ORDER BY id;"
```

## Configuration

Environment variables are loaded from `.env` (see `.env.example`).

| Variable       | Default                                               | Description                  |
| -------------- | ----------------------------------------------------- | ---------------------------- |
| `PORT`         | `3001`                                                | HTTP port for the API        |
| `DATABASE_URL` | `postgresql://jarvis:jarvis@localhost:5433/jarvis_em` | PostgreSQL connection string |

Docker Compose Postgres defaults:

| Setting   | Value         |
| --------- | ------------- |
| Image     | `postgres:16` |
| Host port | `5433`        |
| User      | `jarvis`      |
| Password  | `jarvis`      |
| Database  | `jarvis_em`   |

If you change the Compose port or credentials, update `DATABASE_URL` to match.

## API reference

Base URL: `http://localhost:3001`

### Health

#### `GET /`

Service metadata.

**Response `200`**

```json
{ "message": "Jarvis-em API" }
```

#### `GET /health`

Liveness probe. Does not check the database.

**Response `200`**

```json
{ "status": "ok" }
```

#### `GET /health/db`

Readiness probe. Verifies PostgreSQL connectivity.

**Response `200`**

```json
{ "status": "ok", "database": "connected" }
```

**Response `503`**

```json
{ "database": "disconnected", "error": "<message>" }
```

### Calculator

#### `POST /calculator`

Perform a calculation. On success, the numeric result is persisted and an `id` is returned.

**Request body**

```json
{
  "operation": "add",
  "a": 2,
  "b": 5
}
```

| Field       | Type     | Values                                  |
| ----------- | -------- | --------------------------------------- |
| `operation` | `string` | `add`, `subtract`, `multiply`, `divide` |
| `a`         | `number` | First operand                           |
| `b`         | `number` | Second operand                          |

**Response `200`**

```json
{
  "operation": "add",
  "a": 2,
  "b": 5,
  "result": 7,
  "id": 1
}
```

**Response `400` — invalid body**

```json
{ "error": "Invalid request body" }
```

**Response `400` — divide by zero**

```json
{ "error": "Cannot divide by zero" }
```

If the database insert fails, the API still returns the calculation result but omits `id` (fail-open).

#### `GET /calculator/results`

List all stored calculation results, ordered by `id` ascending.

**Response `200`**

```json
{
  "results": [
    { "id": 1, "result": 7 },
    { "id": 2, "result": 500 }
  ]
}
```

#### `GET /calculator/results/:id`

Fetch a single stored result.

**Response `200`**

```json
{ "id": 1, "result": 7 }
```

**Response `400` — invalid id**

```json
{ "error": "Invalid id" }
```

**Response `404` — not found**

```json
{ "error": "Not found" }
```

## Database

### Migrations

SQL migrations live in `db/migrations/` and are applied with:

```bash
npm run db:migrate
```

Migrations are idempotent (`CREATE TABLE IF NOT EXISTS`). The migrate script waits for Postgres to accept connections before running.

To reset the database completely:

```bash
npm run db:reset
npm run db:up
npm run db:migrate
```

### Schema: `calculation_results`

| Column   | Type               | Description                  |
| -------- | ------------------ | ---------------------------- |
| `id`     | `BIGSERIAL`        | Primary key (auto-increment) |
| `result` | `DOUBLE PRECISION` | Stored calculation result    |

Example data:

```
 id | result
----+--------
  1 |      7
  2 |    500
```

### Persistence behavior

| Event                         | Stored? |
| ----------------------------- | ------- |
| Successful `POST /calculator` | Yes     |
| Invalid request body          | No      |
| Divide by zero                | No      |
| Any `GET` request             | No      |

## Development

### NPM scripts

| Script               | Description                                           |
| -------------------- | ----------------------------------------------------- |
| `npm run dev`        | Start API with hot reload (`tsx watch`)               |
| `npm run start`      | Start API without watch                               |
| `npm run build`      | Compile `src/` to `dist/`                             |
| `npm run start:dist` | Run compiled output from `dist/`                      |
| `npm run check`      | Typecheck, lint, format check, and app tests          |
| `npm run test`       | Vitest in watch mode                                  |
| `npm run test:run`   | Run app tests once (no Docker)                        |
| `npm run test:db`    | Run DB integration tests (requires Docker + Postgres) |
| `npm run db:up`      | Start Postgres (`docker compose up -d --wait`)        |
| `npm run db:down`    | Stop Postgres containers                              |
| `npm run db:reset`   | Stop Postgres and remove the data volume              |
| `npm run db:migrate` | Apply SQL migrations                                  |
| `npm run db:ping`    | Verify database connectivity                          |
| `npm run db:logs`    | Tail Postgres container logs                          |
| `npm run lint`       | Run ESLint                                            |
| `npm run format`     | Format with Prettier                                  |

### Testing

| Suite          | Command            | Docker | Scope                                      |
| -------------- | ------------------ | ------ | ------------------------------------------ |
| App            | `npm run test:run` | No     | Calculator logic and HTTP (Supertest)      |
| DB integration | `npm run test:db`  | Yes    | Postgres CRUD smoke and result persistence |

App tests use `createApp({ enableResultPersistence: false })` so CI and local checks do not require a database.

DB tests run sequentially (`fileParallelism: false`) to avoid connection pool conflicts.

Add tests:

- App-level: `test/<name>.test.ts`
- DB-level: `test/db.<name>.test.ts`

### CI

GitHub Actions runs `npm run check` on push and pull requests to `main`. DB integration tests are run locally.

See [Architecture](#architecture) for how these pieces connect at runtime.

## Project structure

```
db/migrations/          SQL schema migrations
scripts/                CLI helpers (migrate, db ping)
src/
  server.ts             Application entry point
  app.ts                Express app factory
  calculator.ts         Calculator domain logic
  routes/calculator.ts  Calculator HTTP routes
  db/                   Database access layer
test/                   Vitest test suites
.github/workflows/      CI pipeline
docker-compose.yml      Local PostgreSQL
```

Source imports use `.js` extensions (Node ESM / `NodeNext`).

## Troubleshooting

| Symptom                                         | Likely cause                    | Fix                                                 |
| ----------------------------------------------- | ------------------------------- | --------------------------------------------------- |
| `docker compose` fails                          | Docker not running or paused    | Start or unpause Docker Desktop                     |
| `ECONNREFUSED` on port 5433                     | Postgres not started            | `npm run db:up`                                     |
| `read ECONNRESET` right after `db:up`           | Postgres still starting         | `db:up` uses `--wait`; retry `npm run db:migrate`   |
| `relation "calculation_results" does not exist` | Migrations not applied          | `npm run db:migrate`                                |
| `/health/db` returns 503                        | Bad `DATABASE_URL` or DB down   | Check `.env` and `docker compose ps`                |
| No rows in `calculation_results`                | Only successes are stored       | Send valid `POST /calculator` requests              |
| `Calculation result persistence failed` in logs | DB write failed                 | API still responds; fix DB connectivity             |
| App tests hit the database                      | Persistence enabled in test app | Use `createApp({ enableResultPersistence: false })` |

## License

ISC — see [`package.json`](package.json).
