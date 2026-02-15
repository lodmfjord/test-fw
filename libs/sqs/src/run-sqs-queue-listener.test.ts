/** @fileoverview Tests run sqs queue listener. @module libs/sqs/src/run-sqs-queue-listener.test */
import { describe, expect, it } from "bun:test";
import { defineStepFunction } from "@babbstack/step-functions";
import { createMemorySqs } from "./create-memory-sqs";
import { createSqsQueue } from "./create-sqs-queue";
import { runSqsQueueListener } from "./run-sqs-queue-listener";

describe("runSqsQueueListener", () => {
  it("processes queued messages with registered listeners", async () => {
    const sqs = createMemorySqs();
    const seen: Array<{ kind: "ble"; userId: string }> = [];

    const ble = createSqsQueue(
      {
        parse(input: unknown) {
          const source = input as { kind?: unknown; userId?: unknown };
          if (source.kind !== "ble" || typeof source.userId !== "string") {
            throw new Error("invalid ble message");
          }

          return {
            kind: "ble" as const,
            userId: source.userId,
          };
        },
      },
      {
        queueName: "ble-events",
      },
    );
    const listener = ble.addListener({
      handler: async ({ message }) => {
        seen.push(message);
      },
    });

    await ble.bind(sqs).send({
      kind: "ble",
      userId: "user-1",
    });

    const processed = await runSqsQueueListener(listener, sqs);

    expect(processed).toBe(1);
    expect(seen).toEqual([
      {
        kind: "ble",
        userId: "user-1",
      },
    ]);

    const remaining = await sqs.receive({
      maxMessages: 10,
      queueName: "ble-events",
    });
    expect(remaining).toHaveLength(0);
  });

  it("executes step-function targeted listeners without running handler code", async () => {
    const sqs = createMemorySqs();

    const ble = createSqsQueue(
      {
        parse(input: unknown) {
          const source = input as { eventId?: unknown };
          if (typeof source.eventId !== "string") {
            throw new Error("invalid message");
          }

          return {
            eventId: source.eventId,
          };
        },
      },
      {
        queueName: "step-function-events",
      },
    );
    const listener = ble.addListener({
      target: {
        definition:
          '{"StartAt":"Done","States":{"Done":{"Type":"Pass","Result":{"ok":true},"End":true}}}',
        kind: "step-function",
        stateMachineName: "step-function-events",
      },
    });

    await ble.bind(sqs).send({
      eventId: "event-1",
    });

    const processed = await runSqsQueueListener(listener, sqs);

    expect(processed).toBe(1);
  });

  it("runs task and choice states for sync step-function listeners with local handlers", async () => {
    const sqs = createMemorySqs();
    const seen: string[] = [];
    const definition = defineStepFunction({
      StartAt: "GenerateRandom",
      States: {
        GenerateRandom: {
          Type: "Task",
          Resource: "lambda:generate-random-number",
          ResultPath: "$.random",
          Next: "BranchOnRandom",
        },
        BranchOnRandom: {
          Type: "Choice",
          Choices: [
            {
              Variable: "$.random",
              NumericLessThan: 51,
              Next: "HandleLowNumber",
            },
            {
              Variable: "$.random",
              NumericGreaterThan: 50,
              Next: "HandleHighNumber",
            },
          ],
        },
        HandleLowNumber: {
          Type: "Task",
          Resource: "lambda:handle-low-number",
          End: true,
        },
        HandleHighNumber: {
          Type: "Task",
          Resource: "lambda:handle-high-number",
          End: true,
        },
      },
    });

    const queue = createSqsQueue(
      {
        parse(input: unknown) {
          const source = input as { eventId?: unknown };
          if (typeof source.eventId !== "string") {
            throw new Error("invalid message");
          }

          return {
            eventId: source.eventId,
          };
        },
      },
      {
        queueName: "step-function-branch-events",
      },
    );

    const listener = queue.addListener({
      target: {
        definition,
        invocationType: "sync",
        kind: "step-function",
        stateMachineName: "step-function-branch-events",
      },
    });

    await queue.bind(sqs).send({
      eventId: "event-1",
    });

    const processed = await runSqsQueueListener(listener, sqs, {
      stepFunctionTaskHandlers: {
        "lambda:generate-random-number": () => 88,
        "lambda:handle-high-number": () => {
          seen.push("high");
          return { branch: "high" };
        },
        "lambda:handle-low-number": () => {
          seen.push("low");
          return { branch: "low" };
        },
      },
    });

    expect(processed).toBe(1);
    expect(seen).toEqual(["high"]);
  });
});
