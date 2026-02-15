/**
 * @fileoverview Tests resetDefinedSqsListeners behavior.
 */
import { describe, expect, it } from "bun:test";
import { createSqsQueue } from "./create-sqs-queue";
import { listDefinedSqsListeners } from "./list-defined-sqs-listeners";
import { resetDefinedSqsListeners } from "./reset-defined-sqs-listeners";

describe("resetDefinedSqsListeners", () => {
  it("clears registered listeners", () => {
    resetDefinedSqsListeners();

    const queue = createSqsQueue(
      {
        parse(input: unknown) {
          return input as { id: string };
        },
      },
      {
        queueName: "orders",
      },
    );
    queue.addListener({
      handler() {
        return;
      },
      listenerId: "orders_listener",
      target: {
        kind: "lambda",
      },
    });

    expect(listDefinedSqsListeners()).toHaveLength(1);
    resetDefinedSqsListeners();
    expect(listDefinedSqsListeners()).toEqual([]);
  });
});
