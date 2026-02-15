/**
 * @fileoverview Tests create memory sqs.
 */
import { describe, expect, it } from "bun:test";
import { createMemorySqs } from "./create-memory-sqs";

describe("createMemorySqs", () => {
  it("sends, receives, and removes queue messages", async () => {
    const sqs = createMemorySqs();

    await sqs.send({
      message: {
        id: "msg-1",
      },
      queueName: "ble-events",
    });

    const firstBatch = await sqs.receive({
      maxMessages: 10,
      queueName: "ble-events",
    });

    expect(firstBatch).toHaveLength(1);
    expect(firstBatch[0]?.message).toEqual({
      id: "msg-1",
    });

    const receiptHandle = firstBatch[0]?.receiptHandle;
    expect(typeof receiptHandle).toBe("string");

    await sqs.remove({
      queueName: "ble-events",
      receiptHandle: String(receiptHandle),
    });

    const secondBatch = await sqs.receive({
      maxMessages: 10,
      queueName: "ble-events",
    });
    expect(secondBatch).toHaveLength(0);
  });
});
