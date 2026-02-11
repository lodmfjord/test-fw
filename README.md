# babbstack

Monorepo for a reusable API framework library.  
The goal is to define typed HTTP endpoints once and generate deployable contract artifacts for API Gateway HTTP API v2 with one route per Lambda.

## What This Repository Contains

- `apps/`: runnable apps that consume the framework (currently `apps/test-app`)
- `libs/`: shared framework libraries
- `tools/`: internal repository tooling (for example, constraint checks)
- `docs/`: planning and design notes

## Current Packages

- `@babbstack/http-api-contract` (`libs/http-api-contract`)
  - Defines endpoint APIs (`defineGet`, `definePost`, `definePatch`, etc.)
  - Builds deploy contracts from endpoint declarations
  - Runs endpoints in one Bun dev app (`createDevApp`)
  - Generates one Lambda JS entry file per route (`writeLambdaJsFiles`)
- `@babbstack/dynamodb` (`libs/dynamodb`)
  - Runtime DB adapters (in-memory and AWS-backed)
  - Typed table helpers and runtime-aware DB client selection
- `@babbstack/schema` (`libs/schema`)
  - Schema builder + JSON Schema output + runtime parsing wrappers
- `@babbstack/test-app` (`apps/test-app`)
  - Showcase consumer app for local development and artifact generation

## Generated Artifacts

Contract generation writes JSON outputs intended for external deploy/infra repos:

- `openapi.json`
- `routes.manifest.json`
- `lambdas.manifest.json`
- `deploy.contract.json`
- `env.schema.json`

The showcase app also generates lambda runtime entries:

- `dist/lambda-js/*.mjs` (one file per route)

## Development Workflow

1. Define endpoints (example: `apps/test-app/src/endpoints.ts`).
2. Run the dev app locally:
   - `bun run --cwd apps/test-app dev`
3. Generate contract + lambda outputs:
   - `bun run --cwd apps/test-app generate:contracts`
4. Validate repository quality gates:
   - `bun run check`

## Root Commands

- `bun install`
- `bun run test`
- `bun run test:watch`
- `bun run tdd`
- `bun run typecheck`
- `bun run lint`
- `bun run lint:fix`
- `bun run format`
- `bun run format:check`
- `bun run fix`
- `bun run check:constraints`
- `bun run check`

## Repository Constraints

- Strict TDD: write a failing test first, implement minimal change, then refactor.
- Every source file may export at most one function.
- Every source file must be 300 lines or fewer.
- File names use kebab-case.

`bun run check:constraints` enforces constraints for `apps/`, `libs/`, and `tools/` source files (`.ts`, `.tsx`, `.js`, `.jsx`).
