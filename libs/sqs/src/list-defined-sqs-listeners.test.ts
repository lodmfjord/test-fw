import { describe, expect, it } from "bun:test";
import { createSqsQueue } from "./create-sqs-queue";
import { listDefinedSqsListeners } from "./list-defined-sqs-listeners";
import { resetDefinedSqsListeners } from "./reset-defined-sqs-listeners";

describe("sqs listener registry", () => {
  it("registers queue listeners for runtime generation", () => {
    resetDefinedSqsListeners();

    const ble = createSqsQueue(
      {
        parse(input: unknown) {
          return input as { id: string };
        },
      },
      {
        queueName: "ble-events",
      },
    );

    ble.addListener({
      handler: () => {
        return undefined;
      },
      listenerId: "ble_listener",
    });

    const listeners = listDefinedSqsListeners();

    expect(listeners).toHaveLength(1);
    expect(listeners[0]?.listenerId).toBe("ble_listener");
    expect(listeners[0]?.queue.runtime.queueName).toBe("ble-events");
  });
});
