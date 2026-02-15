/**
 * @fileoverview Tests toStepFunctionSqsListeners behavior.
 */
import { describe, expect, it } from "bun:test";
import { toStepFunctionSqsListeners } from "./to-step-function-sqs-listeners";

describe("toStepFunctionSqsListeners", () => {
  it("maps step-function listeners with integration metadata", () => {
    const listeners = toStepFunctionSqsListeners([
      {
        listenerId: "listener-1",
        queue: {
          runtime: {
            queueName: "orders-queue",
          },
        },
        target: {
          definitionJson: "{}",
          invocationType: "async",
          kind: "step-function",
          stateMachineName: "orders-flow",
          workflowType: "STANDARD",
        },
      } as never,
    ]);

    expect(listeners["listener-1"]).toEqual({
      batch_size: 10,
      definition: "{}",
      invocation_type: "async",
      pipe_invocation_type: "FIRE_AND_FORGET",
      queue_key: "orders_queue",
      queue_name: "orders-queue",
      start_action: "states:StartExecution",
      state_machine_name: "orders-flow",
      workflow_type: "STANDARD",
    });
  });
});
