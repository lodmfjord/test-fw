/**
 * @fileoverview Tests toEndpointSqsContext behavior.
 */
import { describe, expect, it } from "bun:test";
import { toEndpointSqsContext } from "./to-endpoint-sqs-context";

describe("toEndpointSqsContext", () => {
  it("sends messages using runtime queue name and optional prefix", async () => {
    const sentInputs: unknown[] = [];
    const previousPrefix = process.env.SIMPLE_API_SQS_QUEUE_NAME_PREFIX;
    process.env.SIMPLE_API_SQS_QUEUE_NAME_PREFIX = "dev-";

    const context = toEndpointSqsContext(
      {
        async send(input: unknown): Promise<void> {
          sentInputs.push(input);
        },
      } as never,
      {
        context: {
          sqs: {
            runtime: {
              queueName: "orders",
            },
          },
        },
      } as never,
    ) as {
      send: (message: unknown) => Promise<unknown>;
    };

    const message = { id: "1" };
    const returned = await context.send(message);

    expect(returned).toEqual(message);
    expect(sentInputs).toEqual([
      {
        message,
        queueName: "dev-orders",
      },
    ]);

    if (previousPrefix === undefined) {
      delete process.env.SIMPLE_API_SQS_QUEUE_NAME_PREFIX;
    } else {
      process.env.SIMPLE_API_SQS_QUEUE_NAME_PREFIX = previousPrefix;
    }
  });
});
