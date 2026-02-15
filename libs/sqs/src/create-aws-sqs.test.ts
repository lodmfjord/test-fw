/** @fileoverview Tests create aws sqs. @module libs/sqs/src/create-aws-sqs.test */
import { describe, expect, it } from "bun:test";
import { createAwsSqs } from "./create-aws-sqs";

describe("createAwsSqs", () => {
  it("delegates send, receive, and remove to aws operations", async () => {
    const sends: unknown[] = [];
    const receives: unknown[] = [];
    const removals: unknown[] = [];

    const sqs = createAwsSqs({
      operations: {
        async receiveMessages(input) {
          receives.push(input);
          return [
            {
              message: {
                id: "msg-1",
              },
              receiptHandle: "receipt-1",
            },
          ];
        },
        async removeMessage(input) {
          removals.push(input);
        },
        async sendMessage(input) {
          sends.push(input);
        },
      },
    });

    await sqs.send({
      message: {
        id: "msg-1",
      },
      queueName: "ble-events",
    });
    const batch = await sqs.receive({
      maxMessages: 2,
      queueName: "ble-events",
    });
    await sqs.remove({
      queueName: "ble-events",
      receiptHandle: "receipt-1",
    });

    expect(sends).toEqual([
      {
        message: {
          id: "msg-1",
        },
        queueName: "ble-events",
      },
    ]);
    expect(receives).toEqual([
      {
        maxMessages: 2,
        queueName: "ble-events",
      },
    ]);
    expect(removals).toEqual([
      {
        queueName: "ble-events",
        receiptHandle: "receipt-1",
      },
    ]);
    expect(batch).toEqual([
      {
        message: {
          id: "msg-1",
        },
        receiptHandle: "receipt-1",
      },
    ]);
  });
});
