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

- AGENTS.md is the authoritative standards document for this repository.
- In non-test source files, each file may export at most one runtime symbol.
- Runtime symbols include exported `function`, `const`, `class`, `enum`, and `export default` values.
- Type-only exports are excluded from runtime export counting.
- `index.ts` files are exempt from runtime export limits and may re-export public API.
- Exported helper-object bags are disallowed (`export const x = { ... }`) when object members are function-valued or use method shorthand.
- Each non-test source file outside `src` must be at most 220 lines.
- Each non-test source file in `src` must be at most 220 lines.
- Each test source file must be at most 260 lines.
- Each top-level function in non-test `src` files must be at most 160 lines.
- Each top-level function in non-test `src` files must have cognitive complexity at most 30.
- Nested ternary operations are not allowed.
- Constraints are enforced by `bun run check:constraints`.
- Full validation command: `bun run check` (tests + constraints).

## Logging Policy

- Use `@babbstack/logger` for runtime logging in apps/libs/tools.
- Reusable library runtime code should default to `createNoopLogger()` unless a caller injects a logger.
- For public APIs that previously accepted `options.log`, keep temporary compatibility and prefer `options.logger`.
- Direct `console.*` calls are disallowed in non-test runtime files.
- Allowed exceptions for direct `console.*`: test files and explicit CLI entry files named `*-bin.ts`.

## Documentation Standards

- Every code file must start with a short file-level JSDoc header describing what the file does.
- Use a header block like:
  ```ts
  /**
   * @fileoverview Utilities for date formatting and parsing used across the app.
   * Provides stable helpers for parsing ISO strings and formatting dates.
   */
  ```
- Do not use `@module` in file headers.
- File-level JSDoc headers must use multiline format.
- Every function must have JSDoc.
- Exported function JSDoc must use multiline format.
- Exported function JSDoc must include `@param` descriptions for all parameters.
- Exported function JSDoc must include `@returns` unless the function is explicitly typed as `void` or `Promise<void>`.
- Exported function JSDoc must include `@throws` when the function body contains a `throw` statement.
- Exported function JSDoc must include at least one `@example`.
- Function JSDoc summary text must not start with `Handles ` or `Converts values to ` (applies to function JSDoc only, not file-level `@fileoverview` blocks).

## Package Export Policy

- All libraries in `libs/*` must export from `dist`, not from `src`.
- For library `package.json` export maps, keep:
  - `bun`: `./dist/index.js`
  - `types`: `./dist/index.d.ts`
  - `default`: `./dist/index.js`
- Library build scripts must produce both runtime JS and declaration files in `dist`.

## Quality Gate Before Handoff

- Run `bun run check`.
- Run `bun run check` as the final step at the end of every task to catch formatting/lint/type/test regressions and fix issues from your changes before handoff.
- Running only `bun run check:constraints` is not sufficient for handoff.
- Do not hand off changes with failing tests or failing constraints.
- Ensure formatting, linting, and typecheck pass via the `check` script.

## Documentation Maintenance

- Always update documentation in the same change as code behavior changes.
- Always update the root README (`/Users/lommi/Projects/simple-api/README.md`) when repository-wide behavior, workflows, scripts, or generated outputs change.
- Always update the relevant app/package README (for example `apps/<name>/README.md`, `libs/<name>/README.md`) when that app/package API, runtime behavior, or commands change.
- New apps and libraries must include a README at creation time.
