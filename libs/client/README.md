# @babbstack/client

Type-safe HTTP client for APIs defined with `@babbstack/http-api-contract`.
The runtime package has no dependency on `@babbstack/http-api-contract`; endpoint contracts are consumed as structural TypeScript types.

## Exports

- `createClient`
- types: `HttpApiClient`, `ClientRequestInput`, `ClientResponse`

## Example

```ts
import { createClient } from "@babbstack/client";
import { getUserEndpoint } from "./user-endpoints";

type ApiEndpoints = typeof import("./endpoints").endpoints;
const routeRefs = [{ method: "GET", path: "/users/{id}", routeId: "get_users_param_id" }] as const;
const client = createClient<ApiEndpoints>("https://api.example.com", routeRefs);
const response = await client.request.endpoint(getUserEndpoint, {
  params: { id: "user-1" },
});

response.data.id;
response.statusCode;
```

Method/path access is also typed:

```ts
const byPath = await client.request.GET["users/{id}"]({
  params: { id: "user-1" },
});
```

The endpoint type is compile-time only. The second argument can be lightweight route references for runtime route lookup and completion helpers:

- `client.request.endpoint(endpoint, input)` typed by endpoint definition
- `client.request.<METHOD>[path](input)` typed by method + path (supports with or without leading slash)
- `client.request.byRouteId(routeId, input)` call by route id
- `client.request.<routeId>(input)` generated route-id methods at runtime

## Build

```bash
bun run --cwd libs/client build
```
