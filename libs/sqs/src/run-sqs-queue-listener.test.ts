import { describe, expect, it } from "bun:test";
import { createMemorySqs } from "./create-memory-sqs";
import { createSqsQueue } from "./create-sqs-queue";
import { runSqsQueueListener } from "./run-sqs-queue-listener";

describe("runSqsQueueListener", () => {
  it("processes queued messages with registered listeners", async () => {
    const sqs = createMemorySqs();
    const seen: Array<{ kind: "ble"; userId: string }> = [];

    const ble = createSqsQueue(
      {
        parse(input: unknown) {
          const source = input as { kind?: unknown; userId?: unknown };
          if (source.kind !== "ble" || typeof source.userId !== "string") {
            throw new Error("invalid ble message");
          }

          return {
            kind: "ble" as const,
            userId: source.userId,
          };
        },
      },
      {
        queueName: "ble-events",
      },
    );
    const listener = ble.addListener({
      handler: async ({ message }) => {
        seen.push(message);
      },
    });

    await ble.bind(sqs).send({
      kind: "ble",
      userId: "user-1",
    });

    const processed = await runSqsQueueListener(listener, sqs);

    expect(processed).toBe(1);
    expect(seen).toEqual([
      {
        kind: "ble",
        userId: "user-1",
      },
    ]);

    const remaining = await sqs.receive({
      maxMessages: 10,
      queueName: "ble-events",
    });
    expect(remaining).toHaveLength(0);
  });
});
