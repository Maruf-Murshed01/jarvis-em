# Jarvis-em

A simple Node.js + Express + TypeScript API server with Vitest unit tests.

## Project layout

```
src/
  app.ts         # Express app (routes, middleware)
  server.ts      # Entry point (PORT, listen)
  calculator.ts  # Pure calculator functions (add, subtract, multiply, divide)

test/
  calculator.test.ts   # Unit tests for calculator

vitest.config.ts   # Central Vitest config (discovers test/**/*.test.ts)
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

| Method | Path      | Response                    |
|--------|-----------|-----------------------------|
| GET    | `/`       | `{ "message": "Jarvis-em API" }` |
| GET    | `/health` | `{ "status": "ok" }`        |

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

### Current coverage

| Module | Test file | Tests |
|--------|-----------|-------|
| `src/calculator.ts` | `test/calculator.test.ts` | add, subtract, multiply, divide, division-by-zero error |

## Manual API checks

With the server running (`npm start`):

```bash
curl http://localhost:3001/
curl http://localhost:3001/health
```
