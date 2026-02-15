# @babbstack/logger

Structured logger wrapper powered by AWS Lambda Powertools Logger.

## Exports

- `createLogger`
- `createNoopLogger`
- `Logger` (type)
- `CreateLoggerInput` (type)

## Basic Example

```ts
import { createLogger } from "@babbstack/logger";

const logger = createLogger({
  persistentKeys: { domain: "billing" },
  serviceName: "orders",
});

logger.info("Order received", {
  orderId: "o-123",
});
```

## No-op Default

Use `createNoopLogger()` for reusable libs where logging should be silent unless the caller injects a logger.

## Build

```bash
bun run --cwd libs/logger build
```
