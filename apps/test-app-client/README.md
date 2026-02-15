# @babbstack/test-app-client

Minimal client app that consumes `@babbstack/client` and binds it to `apps/test-app` endpoint types.

It runs a typed smoke flow against a base URL, calls real endpoints, and logs each response payload.
The script also includes compile-time type assertions for response data.

## Run

```bash
bun run --cwd apps/test-app-client dev
```

Optional base URL argument:

```bash
bun run --cwd apps/test-app-client dev https://api.example.com
```

From repo root:

```bash
bun run dev:client
```

## Example Usage

Create a typed client bound to `apps/test-app` endpoint types without runtime-importing server modules:

```ts
import { createClient } from "@babbstack/client";
import type { endpoints as testAppEndpoints } from "../../test-app/src/endpoints";

type TestAppEndpoints = typeof testAppEndpoints;
const client = createClient<TestAppEndpoints>("http://localhost:3000");
```

Call typed endpoints by method and path key:

```ts
const lastUpdate = await client.request.GET["last-update"]({});
const stepFn = await client.request.POST["step-function-demo"]({
  body: { value: "hello" },
});

lastUpdate.data;
stepFn.data;
```

## Method Examples

These are real routes from current `TestAppEndpoints`:

```ts
await client.request.GET["last-update"]({});
await client.request.POST["step-function-demo"]({
  body: { value: "hello" },
});
await client.request.PUT["order/{id}"]({
  params: { id: "order-1" },
  body: { amount: 99 },
});
await client.request.PATCH["order/{id}"]({
  params: { id: "order-1" },
  body: { status: "closed" },
});
await client.request.DELETE["order/{id}"]({ params: { id: "order-1" } });
await client.request.OPTIONS.order({});
await client.request.HEAD["order/{id}"]({ params: { id: "order-1" } });
```

All methods are type-safe against your endpoint type; wrong method/path combos fail at compile time.
