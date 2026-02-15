/**
 * @fileoverview Tests create runtime sqs.
 */
import { describe, expect, it } from "bun:test";
import type { SqsClient } from "./types";
import { createRuntimeSqs } from "./create-runtime-sqs";

/** Creates named sqs. */
function createNamedSqs(name: string): SqsClient {
  return {
    async receive() {
      return [
        {
          message: {
            source: name,
          },
          receiptHandle: `${name}-receipt`,
        },
      ];
    },
    async remove() {
      return undefined;
    },
    async send() {
      return undefined;
    },
  };
}

describe("createRuntimeSqs", () => {
  it("uses memory sqs outside lambda", async () => {
    const sqs = createRuntimeSqs({
      createAwsSqs: async () => createNamedSqs("aws"),
      createMemorySqs: () => createNamedSqs("memory"),
      isLambdaRuntime: false,
    });

    const batch = await sqs.receive({
      maxMessages: 1,
      queueName: "ble-events",
    });

    expect(batch[0]?.message).toEqual({
      source: "memory",
    });
  });

  it("uses aws sqs inside lambda", async () => {
    const sqs = createRuntimeSqs({
      createAwsSqs: async () => createNamedSqs("aws"),
      createMemorySqs: () => createNamedSqs("memory"),
      isLambdaRuntime: true,
    });

    const batch = await sqs.receive({
      maxMessages: 1,
      queueName: "ble-events",
    });

    expect(batch[0]?.message).toEqual({
      source: "aws",
    });
  });
});
