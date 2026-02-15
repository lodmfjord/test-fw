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
- Generated Lambda runtime entries keep `zod` external (`import "zod"`), and terraform generation always plans a lambda layer dependency for `zod`.
- Lambda runtime validation supports JSON-schema refs/defaults and fails fast on unsupported schema keywords to avoid silent validation gaps.
- Generated Lambda runtime entries emit structured logs for invocation lifecycle and failures (`lambda.invocation.start`, `lambda.invocation.complete`, `lambda.validation.input_failed`, `lambda.handler.failed`, `lambda.validation.output_failed`) and always return `x-request-id` response headers.

This means async Step Function routes and multi-response routes keep runtime and contract status codes aligned.

## Dev Runtime Observability

`createDevApp` now improves error-path observability:

- every response includes an `x-request-id` header (incoming `x-request-id` is reused when provided)
- handler execution failures emit structured logs with event `dev_app.handler_execution_failed`
- output validation failures emit structured logs with event `dev_app.output_validation_failed`
- structured logs include request correlation data (`requestId`, `method`, `path`, `routeId`) and error metadata

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
