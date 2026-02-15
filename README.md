# babbstack

Monorepo for a reusable API framework library. The framework defines typed endpoints once and reuses that source for local dev runtime, Lambda runtime entries, and deploy contracts.

## Repository Layout

- `apps/`: runnable consumers of the framework.
- `libs/`: shared framework libraries.
- `tools/`: repository tooling and checks.
- `docs/`: design and planning notes.

## Packages

- `@babbstack/http-api-contract` (`libs/http-api-contract`): endpoint definitions, dev server runtime, contract generation, lambda entry generation.
- `@babbstack/client` (`libs/client`): type-safe HTTP client for calling endpoint definitions from consumers.
- `@babbstack/schema` (`libs/schema`): typed schema wrappers used by endpoint request/response contracts.
- `@babbstack/step-functions` (`libs/step-functions`): Step Functions definition and local execution helpers.
- `@babbstack/sqs` (`libs/sqs`): runtime SQS adapters, queue definitions, listener registration.
- `@babbstack/dynamodb` (`libs/dynamodb`): runtime DynamoDB adapters and typed table helpers.
- `@babbstack/s3` (`libs/s3`): runtime S3 adapters for local and AWS execution.
- `@babbstack/logger` (`libs/logger`): structured logging wrapper around AWS Lambda Powertools Logger.
- `@babbstack/create-app-cli` (`libs/create-app-cli`): CLI scaffold generator that creates a new `apps/<name>` hello-world app with a compliant `src/app-bin.ts` entrypoint.
- `@babbstack/test-app` (`apps/test-app`): showcase app that exercises the framework end to end.
- `@babbstack/test-app-client` (`apps/test-app-client`): typed client smoke app using `@babbstack/client` against `test-app` endpoints.

## Response Status-Code Model

- Every endpoint has a `successStatusCode` (must be `200..299`).
- Defaults:
  - `OPTIONS`: `204`
  - async Step Function endpoints: `202`
  - all other routes: `200`
- Additional responses are declared via `responses` on endpoint definitions.
- OpenAPI generation includes every entry from `responseByStatusCode`, not just `200`. This keeps contract output aligned with runtime behavior for async and multi-response routes.
- Generated Lambda runtime entries validate request parts (`params`, `query`, `headers`, `body`) with Zod-backed validators derived from endpoint schemas and return `400` on input validation failures.
- Generated Lambda runtime entries validate handler output with the response schema selected by status code and return `500` on output validation failures.
- Generated Lambda runtime entries keep `zod` external (`import "zod"`). Terraform generation now always includes `zod` in lambda layer module planning.
- Generated Lambda runtime entries emit structured lifecycle and failure logs (`lambda.invocation.start`, `lambda.invocation.complete`, `lambda.validation.input_failed`, `lambda.handler.failed`, `lambda.validation.output_failed`) with request correlation fields using AWS Lambda Powertools Logger.
- Generated Lambda runtime responses always include `x-request-id` (reusing inbound `x-request-id` when provided).
- Contract builders (`buildContract`, `buildContractFromEndpoints`) support optional `lambdaDefaults` for `memoryMb`, `timeoutSeconds`, `ephemeralStorageMb`, and `reservedConcurrency`; endpoint-level `aws` options override those defaults per route. When no timeout is provided, `timeoutSeconds` defaults to `15`.
- Generated Terraform lambda resources always default architecture to `arm64`; `memory_size`, `ephemeral_storage`, and `reserved_concurrent_executions` are only set when configured, and `timeout` is set whenever present in the lambda manifest (including the default `15`).
- Generated Terraform provider config now applies AWS `default_tags` to tagged resources with `maintained-by=babbstack` and `name=<appName>`.
- Endpoint resource contexts include scoped runtime bindings for DynamoDB (`context.database`), SQS (`context.sqs`), and S3 buckets (`context.s3` via `createBucket(...)`) with access-aware IAM generation for lambda routes.
- Lambda Terraform generation now creates managed S3 buckets for `context.s3` usage and injects `SIMPLE_API_S3_BUCKET_NAME_PREFIX` into lambda environments so runtime bucket resolution matches deployed resource names.
- Lambda Terraform route SQS send permissions include both `sqs:GetQueueUrl` and `sqs:SendMessage`.
- Lambda Terraform generation now validates secret env markers (`createSecret(...)`) via `data.aws_ssm_parameter` so missing SSM parameters fail at plan/apply time instead of timing out at runtime.
- Step Functions Terraform generation now grants `lambda:InvokeFunction` for lambda task resources referenced in deployed state machine definitions.
- Step-function HTTP endpoints are generated as lambda routes (included in `lambdas.manifest.json`) and use a generated wrapper that validates HTTP input/output while returning sync workflow `output` payloads.
- Direct API Gateway-to-StepFunctions service integrations are generated only when lambda resource generation is disabled.
- `schema.fromZod(...)` is parity-safe for JSON-schema-representable behavior; custom refinements and transform/preprocess pipelines are rejected.

## Generated Artifacts

Contract generation writes outputs that external deploy/infra repos can consume:

- `dist/contracts/openapi.json`
- `dist/contracts/routes.manifest.json`
- `dist/contracts/lambdas.manifest.json`
- `dist/contracts/deploy.contract.json`
- `dist/contracts/env.schema.json`
- `dist/lambda-js/*.mjs` (lambda runtime entries)
- optional Terraform artifacts (`dist/*.tf.json`, `dist/lambda-artifacts`, `dist/layer-artifacts`) when enabled by settings
- generated `api-gateway.tf.json` includes:
  - `output.api_gateway_url` pointing to `${aws_apigatewayv2_api.http_api.api_endpoint}`
  - `output.api_gateway_url_with_stage` pointing to `${aws_apigatewayv2_stage.default.invoke_url}`
  - stage resource naming from `var.stage_name` without resource-name prefixing

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
bun run generate
```

This command runs a full library build first (`build:libs`) so generation works from a clean checkout.

4. Run full quality gate:

```bash
bun run check
```

## Root Scripts

- `bun run dev`
- `bun run dev:client`
- `bun run dev:all`
- `bun run build`
- `bun run generate`
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
- `bun run check:fast`
- `bun run check`
- `bun run create:app -- <app-name>`

Lint commands treat warnings as failing diagnostics (`--error-on-warnings`), so all warnings must be fixed for `lint`, `check:fast`, and `check` to pass.

## Constraints

For authoritative repository standards and exact constraint values, see AGENTS.md.

- Use strict TDD and keep changes within repository constraints.
- `bun run check:constraints` enforces constraints for `apps/`, `libs/`, and `tools/`.
- `bun run check` is fail-fast: constraints run first before format/lint/typecheck/tests.
- Unsafe cast policy in non-test files: `as never` is forbidden, and `as unknown as` requires an immediately preceding `// unsafe-cast:` invariant marker.

## Documentation Rule

Documentation is part of the code contract. Any behavior, API, command, or generated-output change must update:

- the root README, and
- the affected app/library README.
