import { describe, expect, it } from "bun:test";
import { createSqsQueue } from "./create-sqs-queue";
import type { SqsClient } from "./types";

type BleMessage = {
  kind: "ble";
  userId: string;
};

describe("createSqsQueue", () => {
  it("binds typed send operations to a queue name", async () => {
    const sent: unknown[] = [];
    const sqs: SqsClient = {
      async receive() {
        return [];
      },
      async remove() {
        return undefined;
      },
      async send(input) {
        sent.push(input);
      },
    };

    const ble = createSqsQueue(
      {
        parse(input: unknown): BleMessage {
          const source = input as { kind?: unknown; userId?: unknown };
          if (source.kind !== "ble" || typeof source.userId !== "string") {
            throw new Error("invalid ble message");
          }

          return {
            kind: "ble",
            userId: source.userId,
          };
        },
      },
      {
        queueName: "ble-events",
      },
    );

    const message = await ble.bind(sqs).send({
      kind: "ble",
      userId: "user-1",
    });

    expect(message).toEqual({
      kind: "ble",
      userId: "user-1",
    });
    expect(ble.runtimeConfig).toEqual({
      kind: "sqs-queue",
      queueName: "ble-events",
    });
    expect(sent).toEqual([
      {
        message: {
          kind: "ble",
          userId: "user-1",
        },
        queueName: "ble-events",
      },
    ]);
  });
});
