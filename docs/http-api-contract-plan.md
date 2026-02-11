# HTTP API Contract Library Plan

## Goal
Build a reusable library that lets consumer apps define REST endpoints and generate deployable artifacts for API Gateway HTTP API v2 with one endpoint mapped to one Lambda.

## Scope
- This repository provides framework code and artifact generators.
- Consumer apps provide handlers and route declarations.
- Terraform in a separate repository consumes generated artifacts.

## Output Contract
The framework outputs these files:

1. `openapi.json`
2. `routes.manifest.json`
3. `lambdas.manifest.json`
4. `deploy.contract.json`
5. `env.schema.json`

## Route Authoring Model
Endpoints are declared in code with:
- `method` (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`, `HEAD`)
- `path` (supports `/users/{id}` and `:id` normalization)
- `handler` (consumer-owned handler reference)
- `request` schemas (`params`, `query`, `headers`, `body`)
- `response` schema
- `run` handler for local runtime
- optional metadata (`auth`, `summary`, `description`, `tags`, `aws`)

The framework normalizes endpoint data and derives:
- stable `routeId`
- `operationId`

## Compile Model
Given endpoints + environment variable definitions, the framework compiles:
- OpenAPI document
- route manifest (source of truth for routing)
- lambda manifest (one route per lambda)
- deployment contract for infra tools
- runtime environment JSON schema
- Each endpoint compiles to one lambda entry in `lambdas.manifest.json`.

## Runtime Model
- Dev: all endpoints run in one Bun app through one fetch handler.
- Prod: the same endpoint declarations are transformed into one-lambda-per-route manifests.

## Infra Consumption (Separate Terraform Repo)
Terraform reads generated outputs and creates:
- API Gateway HTTP API v2 and stage
- Lambda functions and integrations
- route resources and invoke permissions
- env var wiring using `env.schema.json`

## Current Defaults
- API type: `http-api-v2`
- Stage: `$default`
- Packaging strategy: `one-route-per-lambda`
- Lambda runtime metadata defaults:
  - runtime `nodejs20.x`
  - architecture `arm64`
  - timeout `15`
  - memory `256`

## Future AWS Extensions
Route metadata already supports an `aws` extension object for later features such as:
- authorizers
- per-route performance settings
- additional gateway/lambda options

## Usage Sketch
```ts
import {
  buildContractFromEndpoints,
  createDevApp,
  defineEndpoint,
  schema,
  writeContractFiles,
} from "@simple-api/http-api-contract";

const endpoints = [
  defineEndpoint({
    method: "POST",
    path: "/users",
    handler: ({ body }) => ({ id: `user-${body.name}` }),
    request: {
      body: schema.object({
        name: schema.string(),
      }),
    },
    response: schema.object({
      id: schema.string(),
    }),
  }),
];

const devFetch = createDevApp(endpoints);

const contract = buildContractFromEndpoints({
  apiName: "my-api",
  version: "1.0.0",
  endpoints,
  env: [{ name: "USERS_TABLE", required: true }],
});

await writeContractFiles("dist/contracts", contract);
```

## Validation Strategy
- Strict TDD for generators and normalization logic.
- Contract tests assert deterministic output shape and duplicate route protection.
- Full quality gate is `bun run check`.
