# babbstack

Monorepo for a reusable API framework library. The framework defines typed endpoints once and reuses that source for local dev runtime, Lambda runtime entries, and deploy contracts.

## Repository Layout

- `apps/`: runnable consumers of the framework.
- `libs/`: shared framework libraries.
- `tools/`: repository tooling and checks.
- `docs/`: design and planning notes.

## Packages

- `@babbstack/http-api-contract` (`libs/http-api-contract`): endpoint definitions, dev server runtime, contract generation, lambda entry generation.
- `@babbstack/schema` (`libs/schema`): typed schema wrappers used by endpoint request/response contracts.
- `@babbstack/step-functions` (`libs/step-functions`): Step Functions definition and local execution helpers.
- `@babbstack/sqs` (`libs/sqs`): runtime SQS adapters, queue definitions, listener registration.
- `@babbstack/dynamodb` (`libs/dynamodb`): runtime DynamoDB adapters and typed table helpers.
- `@babbstack/s3` (`libs/s3`): runtime S3 adapters for local and AWS execution.
- `@babbstack/test-app` (`apps/test-app`): showcase app that exercises the framework end to end.

## Response Status-Code Model

- Every endpoint has a `successStatusCode` (must be `200..299`).
- Defaults:
  - `OPTIONS`: `204`
  - async Step Function endpoints: `202`
  - all other routes: `200`
- Additional responses are declared via `responses` on endpoint definitions.
- OpenAPI generation includes every entry from `responseByStatusCode`, not just `200`. This keeps contract output aligned with runtime behavior for async and multi-response routes.

## Generated Artifacts

Contract generation writes outputs that external deploy/infra repos can consume:

- `dist/contracts/openapi.json`
- `dist/contracts/routes.manifest.json`
- `dist/contracts/lambdas.manifest.json`
- `dist/contracts/deploy.contract.json`
- `dist/contracts/env.schema.json`
- `dist/lambda-js/*.mjs` (lambda runtime entries)
- optional Terraform artifacts (`dist/*.tf.json`, `dist/lambda-artifacts`, `dist/layer-artifacts`) when enabled by settings

## Toolchain

- Required Bun version: `1.3.0`
- Tooling dependencies are pinned to exact versions in `/Users/lommi/Projects/simple-api/package.json` for reproducible local and CI checks.
- Library package exports are normalized across `libs/*`:
  - `bun`: `./dist/index.js`
  - `types`: `./dist/index.d.ts`
  - `default`: `./dist/index.js`

## Development

1. Install dependencies:

```bash
bun install
```

2. Run the showcase app locally:

```bash
bun run --cwd apps/test-app dev
```

3. Generate contracts and lambda entries:

```bash
bun run --cwd apps/test-app generate:contracts
```

This command runs a full library build first (`build:libs`) so generation works from a clean checkout.

4. Run full quality gate:

```bash
bun run check
```

## Root Scripts

- `bun run dev`
- `bun run build`
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

## Constraints

- Strict TDD: test first, minimal implementation, then refactor.
- File names must use kebab-case.
- Each source file may export at most one function.
- Export counting is AST-based and includes `export { fn }` / `export default fn` forms for local functions.
- Each source file must be 300 lines or fewer.
- `bun run check:constraints` enforces constraints for `apps/`, `libs/`, and `tools/`.

## Documentation Rule

Documentation is part of the code contract. Any behavior, API, command, or generated-output change must update:

- the root README, and
- the affected app/library README.
