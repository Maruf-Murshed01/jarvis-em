# Jarvis-em

A simple Node.js + Express + TypeScript API server with Vitest unit tests.

## Project layout

```
src/
  app.ts                  # Express app (routes, middleware)
  server.ts               # Entry point (PORT, listen)
  calculator.ts           # Pure calculator functions (add, subtract, multiply, divide)
  routes/
    calculator.ts         # POST /calculator HTTP route

test/
  calculator.test.ts      # Unit tests for calculator
  calculator.api.test.ts  # Integration tests for POST /calculator (supertest)

vitest.config.ts          # Central Vitest config (discovers test/**/*.test.ts)
```

Relative imports use a `.js` extension in source (e.g. `import { createApp } from "./app.js"` in `server.ts`) because Node ESM resolves compiled filenames. Test files import source from `../src/...`.

## Setup

```bash
npm install
```

## Run

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `npm run dev` | Development with auto-restart (`tsx watch`) |
| `start` | `npm start` | Run TypeScript directly (`tsx`) |
| `typecheck` | `npm run typecheck` | Check types without emitting files |
| `build` | `npm run build` | Compile `src/` to `dist/` |
| `start:dist` | `npm run start:dist` | Run compiled output (`node dist/server.js`) |
| `test` | `npm test` | Run Vitest in watch mode (re-runs on save) |
| `test:run` | `npm run test:run` | Run all tests once |

Server runs at `http://localhost:3001` (change with `PORT=4000 npm start`).

## Routes

| Method | Path | Response |
|--------|------|----------|
| GET | `/` | `{ "message": "Jarvis-em API" }` |
| GET | `/health` | `{ "status": "ok" }` |
| POST | `/calculator` | `{ "operation", "a", "b", "result" }` or `{ "error" }` on divide-by-zero |

## Calculator API

One endpoint handles all four operations: add, subtract, multiply, and divide.

### Step 1 — Start the server

```bash
npm run dev
```

Or without auto-restart:

```bash
npm start
```

### Step 2 — Send a POST request

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

### Step 3 — Read the response

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

### Step 4 — Try all four operations

With the server running:

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

Expected results:

| Request | Result |
|---------|--------|
| add `2 + 3` | `"result": 5` |
| subtract `10 - 4` | `"result": 6` |
| multiply `3 * 4` | `"result": 12` |
| divide `10 / 2` | `"result": 5` |
| divide `10 / 0` | `400` with `"error": "Cannot divide by zero"` |

## Testing

Unit tests live in [`test/`](test/) and are run with [Vitest](https://vitest.dev/). One central config at [`vitest.config.ts`](vitest.config.ts) discovers all `test/**/*.test.ts` files — add a new test file there and run `npm test`; no config changes needed.

```bash
npm test            # watch mode
npm run test:run    # single run
```

### Adding tests for a new module

1. Add source in `src/myModule.ts`
2. Add tests in `test/myModule.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { myFn } from "../src/myModule.js";
```

3. Run `npm test`

### API integration tests

HTTP routes are tested with [supertest](https://github.com/ladjs/supertest) against `createApp()` — no running server needed:

```bash
npm run test:run
```

### Current coverage

| Module | Test file | Tests |
|--------|-----------|-------|
| `src/calculator.ts` | `test/calculator.test.ts` | add, subtract, multiply, divide, division-by-zero error |
| `src/routes/calculator.ts` | `test/calculator.api.test.ts` | POST /calculator: all 4 ops, divide-by-zero 400 |

## Manual API checks

With the server running (`npm start` or `npm run dev`):

```bash
curl http://localhost:3001/
curl http://localhost:3001/health
```

See [Calculator API](#calculator-api) above for calculator curl examples.
