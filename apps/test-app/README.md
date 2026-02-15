# @babbstack/test-app

Showcase app for `@babbstack/http-api-contract`. It demonstrates endpoint definition, local execution, contract generation, S3/SQS integrations, and Step Function targets.

## What It Demonstrates

- Lambda-style endpoints and generated Lambda runtime entries.
- Step Function-backed endpoints (including async invocation behavior).
- SQS queue/listener wiring.
- S3 runtime adapter usage.
- Env + secret definitions included in contract output.
- Deployed smoke checks for status-code and response-shape drift.

Endpoints are defined in `apps/test-app/src/endpoints.ts` and Step Function demos in `apps/test-app/src/step-function-demo.ts`.

## Commands

```bash
bun run --cwd apps/test-app dev
bun run --cwd apps/test-app generate:contracts
bun run --cwd apps/test-app smoke:deployed <base-url>
bun test apps/test-app/src/showcase.test.ts
```

`smoke:deployed` executes `apps/test-app/src/smoke-test-deployed-api.ts` and currently verifies:

- `GET /last-update` returns expected payload and status.
- `POST /step-function-demo` success response behavior.
- `POST /step-function-demo` validation failure response behavior.
- expected status codes per case (including multi-response expectations).

## Generated Outputs

`generate:contracts` writes:

- `apps/test-app/dist/contracts/*.json`
- `apps/test-app/dist/lambda-js/*.mjs`
- optional Terraform outputs when enabled by settings:
  - `apps/test-app/dist/*.tf.json`
  - `apps/test-app/dist/lambda-artifacts/*.zip`
  - `apps/test-app/dist/layer-artifacts/*.zip`

Generation settings live in `apps/test-app/babb.settings.json`.
