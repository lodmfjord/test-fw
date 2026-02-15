/**
 * @fileoverview Tests create dev app context sqs.
 */
import { describe, expect, it } from "bun:test";
import { createMemorySqs, createSqsQueue } from "@babbstack/sqs";
import { schema } from "@babbstack/schema";
import { createDevApp } from "./create-dev-app";
import { defineEndpoint } from "./define-endpoint";

describe("createDevApp context.sqs", () => {
  it("binds configured sqs queue into endpoint context", async () => {
    const sqs = createMemorySqs();
    const ble = createSqsQueue(
      {
        parse(input: unknown) {
          const source = input as { kind?: unknown; userId?: unknown };
          if (source.kind !== "ble" || typeof source.userId !== "string") {
            throw new Error("invalid message");
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

    const fetch = createDevApp(
      [
        defineEndpoint({
          method: "POST",
          path: "/ble",
          context: {
            sqs: {
              handler: ble,
            },
          },
          handler: async ({ body, sqs: queue }) => {
            if (!queue) {
              throw new Error("missing queue");
            }
            await queue.send({
              kind: "ble",
              userId: body.userId,
            });
            return {
              value: {
                ok: true,
              },
            };
          },
          request: {
            body: schema.object({
              userId: schema.string(),
            }),
          },
          response: schema.object({
            ok: schema.boolean(),
          }),
        }),
      ],
      {
        sqs,
      },
    );

    const response = await fetch(
      new Request("http://local/ble", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          userId: "user-1",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect((await response.json()) as { ok?: boolean }).toEqual({
      ok: true,
    });

    const batch = await sqs.receive({
      maxMessages: 10,
      queueName: "ble-events",
    });
    expect(batch.map((item) => item.message)).toEqual([
      {
        kind: "ble",
        userId: "user-1",
      },
    ]);
  });
});
