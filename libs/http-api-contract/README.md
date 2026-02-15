# @babbstack/http-api-contract

Declare typed HTTP endpoints once, then reuse that declaration for:

- local dev runtime (`createDevApp`)
- OpenAPI + manifests (`buildContractFromEndpoints`, generator bins)
- generated lambda runtime entries (`writeLambdaJsFiles`)

## Core Exports

- endpoint definition: `defineGet`, `definePost`, `definePut`, `definePatch`, `defineDelete`, `defineHead`, `defineOptions`, `defineEndpoint`
- route + contract helpers: `defineRoute`, `buildContract`, `buildContractFromEndpoints`, `renderContractFiles`, `writeContractFiles`
- runtime/dev helpers: `createDevApp`, `runDevAppFromSettings`
- generation helpers: `renderLambdaJsFiles`, `writeLambdaJsFiles`, `writeSqsListenerJsFiles`, `runContractGeneratorFromSettings`
- env helpers: `createEnv`, `createSecret`

## Response Status Behavior

- `successStatusCode` is part of endpoint metadata and must be an integer in `200..299`.
- Default `successStatusCode` values:
  - `204` for `OPTIONS`
  - `202` for async Step Function endpoints
  - `200` otherwise
- Additional response schemas can be declared via `responses`.
- OpenAPI generation includes all declared response status codes from `responseByStatusCode`.
- Generated Lambda runtime entries validate request schemas (`params`, `query`, `headers`, `body`) with Zod-backed validators derived from endpoint schemas and return `400` on input validation failures.
- Generated Lambda runtime entries validate output schema by resolved status code with the same runtime validator flow and return `500` on output validation failures.
- Generated Lambda runtime entries keep `zod` and `@aws-lambda-powertools/logger` external runtime imports, and terraform generation plans lambda layer dependencies for both modules.
- Lambda runtime validation supports JSON-schema refs/defaults and fails fast on unsupported schema keywords to avoid silent validation gaps.
- Generated Lambda runtime entries emit structured logs for invocation lifecycle and failures (`lambda.invocation.start`, `lambda.invocation.complete`, `lambda.validation.input_failed`, `lambda.handler.failed`, `lambda.validation.output_failed`) and always return `x-request-id` response headers.

This means async Step Function routes and multi-response routes keep runtime and contract status codes aligned.

## Lambda Resource Settings

- `buildContract` and `buildContractFromEndpoints` accept optional `lambdaDefaults`:
  - `memoryMb`
  - `timeoutSeconds`
  - `ephemeralStorageMb`
  - `reservedConcurrency`
- Endpoint-level `aws` values override matching `lambdaDefaults` values per route.
- Route lambdas default architecture to `arm64`.
- Terraform generation only sets lambda `memory_size`, `timeout`, `ephemeral_storage`, and `reserved_concurrent_executions` when those values are configured. When omitted, AWS defaults are left untouched.
- Route IAM generation now also includes per-route S3 policies when `context.s3` is configured on lambda endpoints.
- Terraform generation creates managed S3 buckets for `context.s3` usage and injects `SIMPLE_API_S3_BUCKET_NAME_PREFIX` so runtime bucket names align with deployed resources.
- Route SQS send IAM now includes both `sqs:GetQueueUrl` and `sqs:SendMessage`.
- Route secret env markers (`createSecret(...)`) generate Terraform `data.aws_ssm_parameter` checks and `ssm:GetParameter` IAM policies; missing parameters fail Terraform early.
- API Gateway Terraform generation includes:
  - `output.api_gateway_url` mapped to `${aws_apigatewayv2_api.http_api.api_endpoint}`
  - `output.api_gateway_url_with_stage` mapped to `${aws_apigatewayv2_stage.default.invoke_url}`
  - stage resource naming uses `var.stage_name` directly (no resource-name prefixing)

## Endpoint Context S3

- Endpoints can declare `context.s3` with `handler: createBucket(...)` and explicit access mode lists:
  - `read` (`s3:GetObject`)
  - `write` (`s3:PutObject`, and signed `put` links)
  - `list` (`s3:ListBucket`)
  - `remove` (`s3:DeleteObject`)
- `createDevApp` and generated Lambda runtime entries enforce those access modes at runtime before delegating to the S3 adapter.

## Step Function IAM Naming

- Generated Step Functions IAM role/policy names use distinct prefixes by default:
  - `sfn-` for state machine roles
  - `sfn-lambda-` for lambda invoke policies attached to state machine roles
  - `apigw-` for API Gateway roles/policies
  - `pipes-`, `pipes-src-`, `pipes-tgt-` for EventBridge Pipes roles/policies
- If Terraform variables override those prefixes with empty strings, generation now falls back to the same non-empty defaults to prevent role/policy name collisions.

## Dev Runtime Observability

`createDevApp` now improves error-path observability:

- every response includes an `x-request-id` header (incoming `x-request-id` is reused when provided)
- handler execution failures emit structured logs with event `dev_app.handler_execution_failed`
- output validation failures emit structured logs with event `dev_app.output_validation_failed`
- structured logs include request correlation data (`requestId`, `method`, `path`, `routeId`) and error metadata
- runtime logging uses injected `options.logger` (when provided) and defaults to no-op logging in library code; legacy `options.log` is still supported in `runDevAppFromSettings`

## Example: Multi-Response Endpoint

```ts
import { definePost, schema } from "@babbstack/http-api-contract";

export const createItemEndpoint = definePost({
  path: "/items",
  request: {
    body: schema.object({
      name: schema.string(),
    }),
  },
  response: schema.object({
    id: schema.string(),
  }),
  successStatusCode: 201,
  responses: {
    400: schema.object({
      error: schema.string(),
    }),
    409: schema.object({
      error: schema.string(),
    }),
  },
  handler: async ({ body }) => ({
    value: {
      id: `item-${body.name}`,
    },
  }),
});
```

## Build

```bash
bun run --cwd libs/http-api-contract build
```
