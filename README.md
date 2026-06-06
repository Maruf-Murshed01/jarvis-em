# Jarvis-em

A Node.js + Express + TypeScript REST API with a calculator endpoint, Vitest tests, and PostgreSQL (Docker only).

**Stack:** Express 5 · TypeScript · Vitest · Supertest · PostgreSQL (`pg`) · Docker Compose

---

## Table of contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Project structure](#project-structure)
- [Configuration](#configuration)
- [Step-by-step setup](#step-by-step-setup)
- [API reference](#api-reference)
- [Calculator API](#calculator-api)
- [PostgreSQL](#postgresql-docker-only)
- [Testing](#testing)
- [npm scripts](#npm-scripts)
- [Architecture](#architecture)
- [Roadmap](#roadmap)

---

## Features

| Feature | Status |
|---------|--------|
| REST API with Express | Done |
| Calculator (add, subtract, multiply, divide) | Done |
| Unit + API integration tests | Done |
| PostgreSQL via Docker Compose | Done |
| DB connectivity check (`/health/db`, `db:ping`) | Done |
| DB CRUD smoke test (`test:db`) | Done |
| Request logging to database | Planned |

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| **Node.js** v18+ | Runtime for the API and tests |
| **npm** | Package manager |
| **Docker Desktop** or Docker Engine | Postgres runs **only** in Docker for this project |

Verify Docker is running:

```bash
docker info
```

---

## Quick start

```bash
npm install
cp .env.example .env
npm run db:up
npm run db:ping          # connectivity: SELECT 1
npm run test:db          # CRUD: insert / select / update / delete
npm run dev              # http://localhost:3001
```

In another terminal:

```bash
curl http://localhost:3001/health/db
curl -s -X POST http://localhost:3001/calculator \
  -H "Content-Type: application/json" \
  -d '{"operation":"add","a":2,"b":3}'
```

Run the full test suite (no Docker required):

```bash
npm run typecheck
npm run test:run
```

---

## Project structure

```
jarvis-em/
├── docker-compose.yml       # Postgres 16 container
├── .env.example             # Environment template (commit this)
├── .env                     # Local secrets (gitignored — do not commit)
├── vitest.config.ts         # Default tests (calculator; no DB)
├── vitest.db.config.ts      # DB integration tests only

src/
├── server.ts                # Entry — loads .env, starts server, graceful shutdown
├── app.ts                   # Express app factory (routes, middleware)
├── calculator.ts            # Pure math functions (no HTTP, no DB)
├── db/
│   ├── pool.ts              # pg Pool singleton (getPool, closePool)
│   ├── ping.ts              # SELECT 1 connectivity check
│   └── crudSmoke.ts         # Temp-table CRUD smoke test helper
└── routes/
    └── calculator.ts          # POST /calculator

scripts/
└── db-ping.ts               # CLI connectivity smoke test

test/
├── calculator.test.ts       # Unit tests for calculator.ts
├── calculator.api.test.ts   # Integration tests for POST /calculator
└── db.crud.test.ts          # Postgres CRUD integration test
```

**Import note:** Source files use `.js` extensions in imports (e.g. `import { createApp } from "./app.js"`) because Node ESM resolves compiled filenames.

---

## Configuration

Copy the example environment file and adjust if needed:

```bash
cp .env.example .env
```

| Variable | Purpose | Default |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string for the Docker container | `postgresql://jarvis:jarvis@localhost:5433/jarvis_em` |
| `PORT` | HTTP port for the API | `3001` |

Credentials in `DATABASE_URL` must match [`docker-compose.yml`](docker-compose.yml) (`jarvis` / `jarvis` / `jarvis_em`).

---

## Step-by-step setup

Follow these steps in order on a fresh clone.

### 1 — Install dependencies

```bash
npm install
```

### 2 — Create your environment file

```bash
cp .env.example .env
```

### 3 — Start PostgreSQL

```bash
npm run db:up
```

Wait until the container is healthy:

```bash
docker compose ps
# STATUS should show: running (healthy)
```

Postgres is published on host port **5433** (mapped to `5432` inside the container) to avoid conflicting with a system Postgres on `5432`.

Optional — verify inside the container:

```bash
docker compose exec postgres psql -U jarvis -d jarvis_em -c 'SELECT 1'
```

### 4 — Verify database connectivity

```bash
npm run db:ping
```

Expected output:

```
Database OK
```

### 5 — Verify database read/write (CRUD smoke test)

```bash
npm run test:db
```

This runs INSERT, SELECT, UPDATE, and DELETE against a **temporary table** on a single pooled connection. Nothing permanent is written to the database.

Expected output:

```
Test Files  1 passed (1)
     Tests  1 passed (1)
```

If either step fails, see [PostgreSQL troubleshooting](#postgresql-troubleshooting).

### 6 — Start the API server

Development (auto-restart on file changes):

```bash
npm run dev
```

Or run once without watch:

```bash
npm start
```

Expected console output:

```
Server running on http://localhost:3001
Database connected
```

### 7 — Check the API

```bash
curl http://localhost:3001/
curl http://localhost:3001/health
curl http://localhost:3001/health/db
```

Expected `/health/db` response when Postgres is up:

```json
{ "status": "ok", "database": "connected" }
```

### 8 — Try the calculator

```bash
curl -s -X POST http://localhost:3001/calculator \
  -H "Content-Type: application/json" \
  -d '{"operation":"add","a":2,"b":3}'
```

Expected:

```json
{ "operation": "add", "a": 2, "b": 3, "result": 5 }
```

See [Calculator API](#calculator-api) for all operations.

### 9 — Run application tests

```bash
npm run typecheck
npm run test:run
```

These tests do not require Docker — they use `createApp()` with Supertest and never touch Postgres.

---

## API reference

| Method | Path | Purpose | Response |
|--------|------|---------|----------|
| GET | `/` | API info | `{ "message": "Jarvis-em API" }` |
| GET | `/health` | Liveness — is the app running? | `{ "status": "ok" }` |
| GET | `/health/db` | Readiness — is Postgres reachable? | `{ "status": "ok", "database": "connected" }` or `503` |
| POST | `/calculator` | Run a math operation | See [Calculator API](#calculator-api) |

**Liveness vs readiness:** `/health` never touches the database. `/health/db` runs `SELECT 1` through the `pg` pool.

---

## Calculator API

One endpoint handles all four operations.

### Request

**URL:** `POST http://localhost:3001/calculator`

**Headers:** `Content-Type: application/json`

**Body:**

```json
{
  "operation": "add",
  "a": 2,
  "b": 3
}
```

| Field | Values |
|-------|--------|
| `operation` | `"add"`, `"subtract"`, `"multiply"`, or `"divide"` |
| `a` | First number |
| `b` | Second number |

### Responses

**Success (200):**

```json
{
  "operation": "add",
  "a": 2,
  "b": 3,
  "result": 5
}
```

**Divide by zero (400):**

```json
{
  "error": "Cannot divide by zero"
}
```

### Examples

```bash
# Add
curl -s -X POST http://localhost:3001/calculator \
  -H "Content-Type: application/json" \
  -d '{"operation":"add","a":2,"b":3}'

# Subtract
curl -s -X POST http://localhost:3001/calculator \
  -H "Content-Type: application/json" \
  -d '{"operation":"subtract","a":10,"b":4}'

# Multiply
curl -s -X POST http://localhost:3001/calculator \
  -H "Content-Type: application/json" \
  -d '{"operation":"multiply","a":3,"b":4}'

# Divide
curl -s -X POST http://localhost:3001/calculator \
  -H "Content-Type: application/json" \
  -d '{"operation":"divide","a":10,"b":2}'

# Divide by zero (returns 400)
curl -s -X POST http://localhost:3001/calculator \
  -H "Content-Type: application/json" \
  -d '{"operation":"divide","a":10,"b":0}'
```

| Request | Expected `result` |
|---------|-------------------|
| add `2 + 3` | `5` |
| subtract `10 - 4` | `6` |
| multiply `3 * 4` | `12` |
| divide `10 / 2` | `5` |
| divide `10 / 0` | `400` with `"error": "Cannot divide by zero"` |

### Code structure

```
POST /calculator
  └── routes/calculator.ts   # HTTP layer — reads body, returns JSON
        └── calculator.ts    # Pure functions — add, subtract, multiply, divide
```

Business logic lives in `calculator.ts` with no Express or database imports, so it is easy to unit test.

---

## PostgreSQL (Docker only)

PostgreSQL is the only database for this project. It runs exclusively in Docker — there is no native/macOS Postgres setup in this repo.

### How it connects

```
docker-compose.yml  →  Postgres container (port 5433 on host)
        ↓
   .env DATABASE_URL
        ↓
   src/db/pool.ts    →  pg Pool singleton (getPool, closePool)
        ↓
   src/db/ping.ts    →  SELECT 1 (connectivity)
   src/db/crudSmoke.ts → INSERT / SELECT / UPDATE / DELETE (smoke test)
        ↓
   GET /health/db    →  HTTP readiness probe
   npm run test:db   →  Vitest CRUD integration test
```

### Database scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `db:up` | `npm run db:up` | Start Postgres container |
| `db:down` | `npm run db:down` | Stop Postgres container |
| `db:reset` | `npm run db:reset` | Stop and wipe all DB data |
| `db:logs` | `npm run db:logs` | Tail Postgres container logs |
| `db:ping` | `npm run db:ping` | CLI connectivity test (`SELECT 1`) |
| `test:db` | `npm run test:db` | Vitest CRUD smoke test (requires Postgres) |

### Docker Compose credentials

| Setting | Value |
|---------|-------|
| Service name | `postgres` |
| Image | `postgres:16` |
| Host port | `5433` |
| User | `jarvis` |
| Password | `jarvis` |
| Database | `jarvis_em` |

### PostgreSQL troubleshooting

| Problem | Fix |
|---------|-----|
| Docker daemon not running | Start Docker Desktop, then `npm run db:up` |
| `db:ping` fails immediately after `db:up` | Wait for `running (healthy)` in `docker compose ps` |
| Port 5433 in use | Change Compose to another host port (e.g. `5434:5432`) and update `DATABASE_URL` |
| Wrong password | `DATABASE_URL` must match `docker-compose.yml` credentials |
| `/health/db` fails but `db:ping` works | Ensure `server.ts` has `import "dotenv/config"` as the first import |
| Server crashes when stopping Postgres | The pool handles idle connection errors; restart with `npm run dev` after `db:up` |
| `test:db` fails but `db:ping` passes | Check Docker is up; CRUD uses a single pooled connection with a temp table — see `src/db/crudSmoke.ts` |

### Verify Postgres end-to-end

```bash
npm run db:up
docker compose ps                                          # running (healthy)
docker compose exec postgres psql -U jarvis -d jarvis_em -c 'SELECT 1'
npm run db:ping                                            # Database OK
npm run test:db                                            # 1 test passed (CRUD)
npm run dev                                                # in another terminal
curl http://localhost:3001/health/db                       # connected

# Negative test — stop DB, app should still respond
npm run db:down
curl -s -w "\nHTTP:%{http_code}\n" http://localhost:3001/health/db   # 503 disconnected
curl http://localhost:3001/health                            # still ok
npm run db:up                                                # bring DB back
```

---

## Testing

Tests use [Vitest](https://vitest.dev/) and are split into two suites so application tests never require Docker.

| Suite | Config | Command | Requires Postgres |
|-------|--------|---------|-------------------|
| Application | [`vitest.config.ts`](vitest.config.ts) | `npm run test:run` | No |
| Database | [`vitest.db.config.ts`](vitest.db.config.ts) | `npm run test:db` | Yes |

```bash
npm test            # watch mode — application tests only
npm run test:run    # single run — application tests only
npm run test:db     # Postgres CRUD integration test
```

### What is tested

| Module | Test file | Coverage |
|--------|-----------|----------|
| `src/calculator.ts` | `test/calculator.test.ts` | add, subtract, multiply, divide, divide-by-zero error |
| `src/routes/calculator.ts` | `test/calculator.api.test.ts` | POST /calculator — all 4 ops, divide-by-zero 400 |
| `src/db/crudSmoke.ts` | `test/db.crud.test.ts` | INSERT, SELECT, UPDATE, DELETE on a temp table |

API tests use [Supertest](https://github.com/ladjs/supertest) against `createApp()` — no running server required.

The DB test uses a real Postgres instance via `getPool()`. It creates a connection-scoped temp table, runs full CRUD, and closes the pool in `afterAll`.

### Adding tests for a new module

1. Add source in `src/myModule.ts`
2. Add tests in `test/myModule.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { myFn } from "../src/myModule.js";
```

3. Run `npm test`

For database integration tests, name the file `test/db.*.test.ts` so it is picked up by `vitest.db.config.ts` and excluded from the default suite.

---

## npm scripts

### Application

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `npm run dev` | Dev server with auto-restart (`tsx watch`) |
| `start` | `npm start` | Run server once (`tsx`) |
| `build` | `npm run build` | Compile `src/` → `dist/` |
| `start:dist` | `npm run start:dist` | Run compiled output (`node dist/server.js`) |
| `typecheck` | `npm run typecheck` | Type-check without emitting files |

### Database

| Script | Command | Purpose |
|--------|---------|---------|
| `db:up` | `npm run db:up` | Start Postgres container |
| `db:down` | `npm run db:down` | Stop Postgres container |
| `db:reset` | `npm run db:reset` | Stop and wipe DB volume |
| `db:logs` | `npm run db:logs` | Tail Postgres logs |
| `db:ping` | `npm run db:ping` | CLI `SELECT 1` connectivity test |
| `test:db` | `npm run test:db` | Vitest CRUD smoke test |

### Tests

| Script | Command | Purpose |
|--------|---------|---------|
| `test` | `npm test` | Vitest watch mode (application tests) |
| `test:run` | `npm run test:run` | Run application tests once |
| `test:db` | `npm run test:db` | Run database integration tests once |

Server URL: `http://localhost:3001` (override with `PORT=4000 npm start`).

---

## Architecture

```mermaid
flowchart TB
  subgraph client [Client]
    Curl[curl / browser]
  end
  subgraph app [Node app]
    Server[server.ts]
    App[app.ts]
    CalcRoute[routes/calculator.ts]
    CalcLogic[calculator.ts]
    Pool[db/pool.ts]
    Ping[db/ping.ts]
    CrudSmoke[db/crudSmoke.ts]
  end
  subgraph tests [Tests]
    AppTests[calculator tests]
    DbTests[db.crud.test.ts]
  end
  subgraph docker [Docker]
    PG[(PostgreSQL 16)]
  end
  Curl --> App
  Server --> App
  App --> CalcRoute --> CalcLogic
  App --> Ping --> Pool
  CrudSmoke --> Pool
  DbTests --> CrudSmoke
  Pool --> PG
```

**Layers:**

| Layer | Responsibility |
|-------|----------------|
| `server.ts` | Boots the app, loads `.env`, closes the DB pool on shutdown |
| `app.ts` | Wires routes and middleware; exported as `createApp()` for tests |
| `routes/` | HTTP handlers only |
| `calculator.ts` | Pure domain logic |
| `db/pool.ts` | Shared PostgreSQL connection pool |
| `db/ping.ts` | Connectivity health check (`SELECT 1`) |
| `db/crudSmoke.ts` | Disposable CRUD verification for tests and manual checks |

---

## Roadmap

Planned follow-ups (not implemented yet):

1. SQL migration for a `request_logs` table
2. Middleware to save every GET/POST request to Postgres
3. Reuse `getPool()` from `src/db/pool.ts` for persistence

Phase 1 (CRUD smoke test) is complete. Phase 2 will add the first permanent schema and request logging middleware.
