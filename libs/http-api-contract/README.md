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

This means async Step Function routes and multi-response routes keep runtime and contract status codes aligned.

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
