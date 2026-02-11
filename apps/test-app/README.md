# @simple-api/test-app

Simple showcase app that defines schema-first endpoints with `@simple-api/http-api-contract`.

The same endpoint declarations are used for:
- one Bun app in dev (`bun serve` via `createDevApp`)
- many Lambda entries in prod (generated manifests/contracts)

Endpoints are defined in `/Users/lommi/Projects/simple-api/apps/test-app/src/endpoints.ts`.
The file just calls `defineGet` / `definePost` directly; no exported endpoint array is required.

## Commands

- `bun test apps/test-app/src/showcase.test.ts`
- `bun run --cwd apps/test-app dev`
- `bun run --cwd apps/test-app generate:contracts`

`generate:contracts` writes:
- `dist/contracts/*.json`
- `dist/lambda-js/*.mjs`
