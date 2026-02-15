/**
 * @fileoverview Tests toSqsListenersById behavior.
 */
import { describe, expect, it } from "bun:test";
import { toSqsListenersById } from "./to-sqs-listeners-by-id";

describe("toSqsListenersById", () => {
  it("maps lambda listeners with defaults and sorted ids", () => {
    const listeners = toSqsListenersById([
      {
        listenerId: "b-listener",
        queue: {
          runtime: {
            queueName: "orders-queue",
          },
        },
        target: {
          kind: "lambda",
        },
      } as never,
      {
        listenerId: "a-listener",
        queue: {
          runtime: {
            queueName: "audit-queue",
          },
        },
        target: {
          definitionJson: "{}",
          invocationType: "sync",
          kind: "step-function",
          stateMachineName: "audit",
          workflowType: "STANDARD",
        },
      } as never,
    ]);

    expect(Object.keys(listeners)).toEqual(["b-listener"]);
    expect(listeners["b-listener"]).toEqual({
      batch_size: 10,
      memory_mb: 256,
      queue_key: "orders_queue",
      queue_name: "orders-queue",
      timeout_seconds: 15,
    });
  });
});
