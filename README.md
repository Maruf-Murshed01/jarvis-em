# Jarvis-em

A simple Node.js + Express + TypeScript API server.

## Project layout

```
src/
  app.ts      # Express app (routes, middleware)
  server.ts   # Entry point (PORT, listen)
```

Relative imports use a `.js` extension in source (e.g. `import { createApp } from "./app.js"` in `server.ts`) because Node ESM resolves compiled filenames.

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
| `build` | `npm run build` | Compile to `dist/` |
| `start:dist` | `npm run start:dist` | Run compiled output (`node dist/server.js`) |

Server runs at `http://localhost:3001` (change with `PORT=4000 npm start`).

## Routes

| Method | Path      | Response                    |
|--------|-----------|-----------------------------|
| GET    | `/`       | `{ "message": "Jarvis-em API" }` |
| GET    | `/health` | `{ "status": "ok" }`        |

## Test

```bash
curl http://localhost:3001/
curl http://localhost:3001/health
```
