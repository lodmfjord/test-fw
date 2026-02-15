# @babbstack/test-app

Showcase app for `@babbstack/http-api-contract`. It demonstrates endpoint definition, local execution, contract generation, S3/SQS integrations, and Step Function targets.

## What It Demonstrates

- Lambda-style endpoints and generated Lambda runtime entries.
- Step Function-backed endpoints (including async invocation behavior).
- SQS queue/listener wiring.
- S3 runtime adapter usage.
- Env + secret definitions included in contract output.
- Additional REST method coverage via `/order` demo endpoints (`PUT`, `PATCH`, `DELETE`, `OPTIONS`, `HEAD`).
- Deployed smoke checks for status-code and response-shape drift.

Endpoints are defined in `apps/test-app/src/endpoints.ts` and Step Function demos in `apps/test-app/src/step-function-demo.ts`.
`apps/test-app/src/test-app-contract.ts` sets `lambdaDefaults.timeoutSeconds` to `15`.

## Commands

```bash
bun run --cwd apps/test-app dev
bun run --cwd apps/test-app generate:contracts
bun run --cwd apps/test-app smoke:deployed <base-url>
bun test apps/test-app/src/showcase.test.ts
```

`smoke:deployed` executes `apps/test-app/src/smoke-test-deployed-api.ts` and currently verifies:

- all published endpoints in `apps/test-app/src/endpoints.ts`, including:
- `GET /last-update`, `GET /env-demo`
- S3 demo routes (`POST`/`GET`/`raw`/`list`/`secure-link`)
- order demo routes (`PUT`, `PATCH`, `HEAD`, `OPTIONS`, `DELETE`)
- Step Function routes (`/step-function-demo`, `/step-function-random-branch`, `/step-function-events`)
- expected status codes and response-shape checks per route.
- `OPTIONS /order` is validated as `204` and checks CORS preflight headers:
- `access-control-allow-origin` matches `https://app.example.com`
- `access-control-allow-methods` includes `PUT` and `OPTIONS`
- `access-control-allow-headers` includes `content-type` and `authorization`

S3 demo routes now use a fixed bucket configured via `createBucket({ name: "test-app-s3-demo" })`
and `context.s3` access declarations, so deployed smoke tests no longer require a bucket-name CLI arg.

`generate:contracts` first runs the workspace `build:libs` script so generation is deterministic from a clean checkout.
`dev` also runs `build:libs` first so local runtime startup resolves built library exports from `dist`.

## Generated Outputs

`generate:contracts` writes:

- `apps/test-app/dist/contracts/*.json`
- `apps/test-app/dist/lambda-js/*.mjs`
- optional Terraform outputs when enabled by settings:
  - `apps/test-app/dist/*.tf.json`
  - `apps/test-app/dist/lambda-artifacts/*.zip`
  - `apps/test-app/dist/layer-artifacts/*.zip`

Generation settings live in `apps/test-app/babb.settings.json`.
The default settings enable Terraform DynamoDB resource generation (`terraform.resources.dynamodb: true`).
