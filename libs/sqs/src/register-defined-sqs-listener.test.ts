/**
 * @fileoverview Tests registerDefinedSqsListener behavior.
 */
import { beforeEach, describe, expect, it } from "bun:test";
import { listDefinedSqsListeners } from "./list-defined-sqs-listeners";
import { registerDefinedSqsListener } from "./register-defined-sqs-listener";
import { resetDefinedSqsListeners } from "./reset-defined-sqs-listeners";

describe("registerDefinedSqsListener", () => {
  beforeEach(() => {
    resetDefinedSqsListeners();
  });

  it("upserts listeners by listenerId", () => {
    registerDefinedSqsListener({
      listenerId: "listener-1",
      parse(input: unknown) {
        return input;
      },
      queue: {
        runtime: {
          kind: "sqs-queue",
          queueName: "queue-1",
        },
      },
      target: {
        kind: "lambda",
      },
    } as never);

    registerDefinedSqsListener({
      listenerId: "listener-1",
      parse(input: unknown) {
        return input;
      },
      queue: {
        runtime: {
          kind: "sqs-queue",
          queueName: "queue-2",
        },
      },
      target: {
        kind: "lambda",
      },
    } as never);

    expect(listDefinedSqsListeners()).toHaveLength(1);
    expect(listDefinedSqsListeners()[0]?.queue.runtime.queueName).toBe("queue-2");
  });
});
