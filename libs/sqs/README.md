# @babbstack/sqs

SQS adapters and typed queue/listener helpers for local and AWS runtimes.

## Exports

- clients: `createMemorySqs`, `createAwsSqs`, `createRuntimeSqs`
- queue/listener: `createSqsQueue`, `runSqsQueueListener`
- listener registry: `listDefinedSqsListeners`, `resetDefinedSqsListeners`
- Step Function re-exports: `defineStepFunction`, `registerStepFunctionTaskHandler`

## Example

```ts
import { createRuntimeSqs, createSqsQueue } from "@babbstack/sqs";

const sqs = createRuntimeSqs();

const queue = createSqsQueue(
  {
    parse(input) {
      if (!input || typeof input !== "object") {
        throw new Error("invalid message");
      }

      const source = input as { eventId?: unknown };
      if (typeof source.eventId !== "string") {
        throw new Error("invalid eventId");
      }

      return { eventId: source.eventId };
    },
  },
  {
    queueName: "events",
  },
);

const bound = queue.bind(sqs);
await bound.send({ eventId: "evt-1" });
```

## Build

```bash
bun run --cwd libs/sqs build
```
