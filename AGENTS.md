# Project Rules

## Stack and Repository

- Use Bun for package management, scripts, and tests.
- Use Biome for formatting and linting.
- This repository is a monorepo.
- Keep runnable apps in `apps/`.
- Keep shared packages/libraries in `libs/`.
- Keep repo tooling in `tools/`.
- Boilerplate only by default; do not add app/business implementation unless explicitly requested.

## Product Scope

- This repository is the API framework/library consumed by other apps.
- Prioritize reusable framework primitives and contract generation over app-specific business logic.
- Generated outputs must be consumable by external deploy/infra repos (for example: `openapi.json`, route/lambda manifests, deploy contract, env schema).
- Baseline deployment target is API Gateway HTTP API v2 with one-route-per-lambda, while keeping room for future AWS-specific extensions.

## Naming Convention

- Use kebab-case for file names: `blabla-blabla.ts`, `blabla-blabla.test.ts`.
- Do not use camelCase file names like `blablaBlabla.ts`.
- Keep names scoped and avoid redundant `api-framework` prefixes where context already provides it.

## Development Process (Strict TDD)

- Follow strict TDD:
  1. Write a failing test first.
  2. Implement the smallest change to pass.
  3. Refactor while keeping tests green.
- Prefer watch mode during development: `bun run tdd`.

## File Constraints

- Every source file may export at most one function.
- Every source file must be at most 300 lines.
- Constraints are enforced by `bun run check:constraints`.
- Full validation command: `bun run check` (tests + constraints).

## Quality Gate Before Handoff

- Run `bun run check`.
- Do not hand off changes with failing tests or failing constraints.
- Ensure formatting, linting, and typecheck pass via the `check` script.

## Documentation Maintenance

- Always update documentation in the same change as code behavior changes.
- Always update the root README (`/Users/lommi/Projects/simple-api/README.md`) when repository-wide behavior, workflows, scripts, or generated outputs change.
- Always update the relevant app/package README (for example `apps/<name>/README.md`, `libs/<name>/README.md`) when that app/package API, runtime behavior, or commands change.
- New apps and libraries must include a README at creation time.
