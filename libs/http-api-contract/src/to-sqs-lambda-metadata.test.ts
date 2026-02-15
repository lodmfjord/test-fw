/**
 * @fileoverview Tests toRouteSqsSendAccess behavior.
 */
import { describe, expect, it } from "bun:test";
import { toRouteSqsSendAccess } from "./to-sqs-lambda-metadata";

describe("toRouteSqsSendAccess", () => {
  it("maps sqs send access for lambda endpoints", () => {
    const access = toRouteSqsSendAccess([
      {
        context: {
          sqs: {
            runtime: {
              queueName: "events-queue",
            },
          },
        },
        execution: { kind: "lambda" },
        routeId: "post_events",
      } as never,
      {
        execution: { kind: "step-function" },
        routeId: "post_flow",
      } as never,
    ]);

    expect(access).toEqual({
      post_events: {
        actions: ["sqs:SendMessage"],
        queue_key: "events_queue",
        queue_name: "events-queue",
      },
    });
  });
});
