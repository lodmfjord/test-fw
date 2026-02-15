/**
 * @fileoverview Tests toSqsQueues behavior.
 */
import { describe, expect, it } from "bun:test";
import { toSqsQueues } from "./to-sqs-queues";

describe("toSqsQueues", () => {
  it("collects queue names from endpoints and listeners", () => {
    const queues = toSqsQueues(
      [
        {
          context: {
            sqs: {
              runtime: {
                queueName: "orders-queue",
              },
            },
          },
        } as never,
      ],
      [
        {
          queue: {
            runtime: {
              queueName: "audit-queue",
            },
          },
        } as never,
      ],
    );

    expect(queues).toEqual({
      audit_queue: { name: "audit-queue" },
      orders_queue: { name: "orders-queue" },
    });
  });
});
