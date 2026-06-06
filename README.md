# Jarvis-em

A Node.js + Express + TypeScript REST API with a calculator endpoint, Vitest tests, and PostgreSQL (Docker only).

**Stack:** Express 5 · TypeScript · Vitest · Supertest · PostgreSQL (`pg`) · Docker Compose

---

## What this project has

| Feature | Status |
|---------|--------|
| REST API with Express | Done |
| Calculator (add, subtract, multiply, divide) | Done |
| Unit + API integration tests | Done |
| PostgreSQL via Docker Compose | Done |
| DB connectivity check (`/health/db`, `db:ping`) | Done |
| Request logging to database | Not yet |

---

## Prerequisites

Before you start, make sure you have:

1. **Node.js** (v18+ recommended)
2. **npm**
3. **Docker Desktop** (or Docker Engine) — Postgres runs **only** in Docker for this project

Check Docker is running:

```bash
docker info
```

---

## Project layout

```
jarvis-em/
├── docker-compose.yml      # Postgres 16 container
├── .env.example            # Environment template (commit this)
├── .env                    # Your local secrets (gitignored — do not commit)

src/
├── server.ts               # Entry point — loads .env, starts server, graceful shutdown
├── app.ts                  # Express app factory (routes, middleware)
├── calculator.ts           # Pure math functions (no HTTP, no DB)
├── db/
│   ├── pool.ts             # pg Pool singleton (getPool, closePool)
│   └── ping.ts             # SELECT 1 connectivity check
└── routes/
    └── calculator.ts       # POST /calculator

scripts/
└── db-ping.ts              # CLI smoke test for Postgres

test/
├── calculator.test.ts      # Unit tests for calculator.ts
└── calculator.api.test.ts  # Integration tests for POST /calculator

vitest.config.ts            # Discovers test/**/*.test.ts
```

**Import note:** Source files use `.js` extensions in imports (e.g. `import { createApp } from "./app.js"`) because Node ESM resolves compiled filenames.

---

## Step-by-step: get the project running

Follow these steps in order on a fresh clone.

### Step 1 — Install dependencies

```bash
npm install
```

### Step 2 — Create your environment file

```bash
cp .env.example .env
```

Your `.env` should look like this:

```bash
DATABASE_URL=postgresql://jarvis:jarvis@localhost:5433/jarvis_em
PORT=3001
```

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Connection string for the Docker Postgres container |
| `PORT` | HTTP port for the API (default `3001`) |

Credentials must match `docker-compose.yml` (`jarvis` / `jarvis` / `jarvis_em`).

### Step 3 — Start PostgreSQL (Docker)

```bash
npm run db:up
```

Wait until the container is healthy:

```bash
docker compose ps
# STATUS should show: running (healthy)
```

The container publishes Postgres on host port **5433** (mapped to `5432` inside the container). Port 5433 is used so this project does not conflict with a system Postgres that may already run on `5432`.

Optional — verify Postgres directly inside the container:

```bash
docker compose exec postgres psql -U jarvis -d jarvis_em -c 'SELECT 1'
```

### Step 4 — Verify Node can reach Postgres

```bash
npm run db:ping
```

Expected output:

```
Database OK
```

If this fails, see [PostgreSQL troubleshooting](#postgresql-troubleshooting).

### Step 5 — Start the API server

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

### Step 6 — Check the API is working

```bash
# Root
curl http://localhost:3001/

# App liveness (no DB check)
curl http://localhost:3001/health

# Database readiness
curl http://localhost:3001/health/db
```

Expected `/health/db` response when Postgres is up:

```json
{ "status": "ok", "database": "connected" }
```

### Step 7 — Try the calculator

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

### Step 8 — Run tests

```bash
npm run typecheck
npm run test:run
```

Tests do not require Docker — they use `createApp()` with Supertest and never hit `/health/db`.

---

## API routes

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

### Try all four operations

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

### How it is structured in code

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
   src/db/pool.ts    →  pg Pool singleton
        ↓
   src/db/ping.ts    →  SELECT 1
        ↓
   GET /health/db
```

### Database scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `db:up` | `npm run db:up` | Start Postgres container |
| `db:down` | `npm run db:down` | Stop Postgres container |
| `db:reset` | `npm run db:reset` | Stop and wipe all DB data |
| `db:logs` | `npm run db:logs` | Tail Postgres container logs |
| `db:ping` | `npm run db:ping` | Test Node → Postgres without starting the HTTP server |

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

### Verify Postgres is really working (full checklist)

```bash
npm run db:up
docker compose ps                                          # running (healthy)
docker compose exec postgres psql -U jarvis -d jarvis_em -c 'SELECT 1'
npm run db:ping                                            # Database OK
npm run dev                                                # in another terminal
curl http://localhost:3001/health/db                       # connected

# Negative test — stop DB, app should still respond
npm run db:down
curl -s -w "\nHTTP:%{http_code}\n" http://localhost:3001/health/db   # 503 disconnected
curl http://localhost:3001/health                            # still ok
```

---

## npm scripts reference

### App

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
| `db:ping` | `npm run db:ping` | CLI `SELECT 1` smoke test |

### Tests

| Script | Command | Purpose |
|--------|---------|---------|
| `test` | `npm test` | Vitest watch mode |
| `test:run` | `npm run test:run` | Run all tests once |

Server URL: `http://localhost:3001` (override with `PORT=4000 npm start`).

---

## Testing

Tests live in [`test/`](test/) and run with [Vitest](https://vitest.dev/). Config is in [`vitest.config.ts`](vitest.config.ts) — it discovers all `test/**/*.test.ts` files automatically.

```bash
npm test            # watch mode — re-runs on save
npm run test:run    # single run
```

### What is tested

| Module | Test file | Coverage |
|--------|-----------|----------|
| `src/calculator.ts` | `test/calculator.test.ts` | add, subtract, multiply, divide, divide-by-zero error |
| `src/routes/calculator.ts` | `test/calculator.api.test.ts` | POST /calculator — all 4 ops, divide-by-zero 400 |

API tests use [Supertest](https://github.com/ladjs/supertest) against `createApp()` — no running server or database required.

### Adding tests for a new module

1. Add source in `src/myModule.ts`
2. Add tests in `test/myModule.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { myFn } from "../src/myModule.js";
```

3. Run `npm test`

---

## Architecture overview

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
  end
  subgraph docker [Docker]
    PG[(PostgreSQL 16)]
  end
  Curl --> App
  Server --> App
  App --> CalcRoute --> CalcLogic
  App --> Ping --> Pool
  Pool --> PG
```

**Layers:**

- **`server.ts`** — boots the app, loads `.env`, closes the DB pool on shutdown
- **`app.ts`** — wires routes and middleware; exported as `createApp()` for tests
- **`routes/`** — HTTP handlers only
- **`calculator.ts`** — pure domain logic
- **`db/`** — PostgreSQL connection and health check

---

## What's next

Planned follow-ups (not implemented yet):

1. SQL migration for a `request_logs` table
2. Middleware to save every GET/POST request to Postgres
3. Reuse `getPool()` from `src/db/pool.ts` for persistence
