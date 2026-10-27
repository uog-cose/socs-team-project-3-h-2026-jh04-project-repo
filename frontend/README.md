# pyMechT frontend

React + Vite + TypeScript GUI for pyMechT.

## Setup

Requires Node 22.12+ (`.nvmrc` pins 24).

```sh
cd frontend
npm ci
npm run dev
```

`npm run dev` serves mocked API responses by default, so the backend doesn't need to be running.
To use the real backend, copy `.env.example` to `.env.local` and set `VITE_USE_MOCKS=false`.

## Scripts

| Script                      | What it does                                           |
| --------------------------- | ------------------------------------------------------ |
| `npm run dev`               | Dev server on http://localhost:5173                    |
| `npm run build`             | Type-check and build to `dist/`                        |
| `npm run lint`              | ESLint                                                 |
| `npm run format`            | Prettier (`format:check` to check only)                |
| `npm run typecheck`         | TypeScript                                             |
| `npm test`                  | Vitest + React Testing Library (`test:watch` to watch) |
| `npm run generate:api`      | Regenerate `src/api/schema.gen.ts` from `openapi/`     |
| `npm run generate:api:live` | Regenerate from the running backend's `/openapi.json`  |

## Folder structure

```
openapi/           Draft OpenAPI contract (until the backend serves its own)
src/
  api/             Generated types, API client and TanStack Query hooks
  app/             App root, providers and the list of sections
  components/      Shared UI: layout, log panel, plot, logo
  features/        One folder per section (material, experiment, ...)
  mocks/           MSW handlers and mock data
  state/           Zustand stores (session config, log)
  theme/           Palette and Mantine theme
  test/            Test setup and render helpers
```

## API and mocks

Types in `src/api/schema.gen.ts` are generated from the OpenAPI schema; don't edit them by hand.
Use the aliases in `src/api/types.ts` and the hooks in `src/api/queries.ts`.

The mocks in `src/mocks` answer the same endpoints with realistic data. They run in the browser
through a service worker in dev and through `msw/node` in tests.
