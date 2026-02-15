/**
 * @fileoverview Tests createStepFunctionsTerraformJson behavior.
 */
import { describe, expect, it } from "bun:test";
import { createStepFunctionsTerraformJson } from "./create-step-functions-terraform-json";

describe("createStepFunctionsTerraformJson", () => {
  it("renders locals for endpoint and listener state machines", () => {
    const terraformJson = createStepFunctionsTerraformJson(
      [
        {
          execution: {
            definitionJson: "{}",
            invocationType: "sync",
            kind: "step-function",
            stateMachineName: "orders-flow",
            workflowType: "STANDARD",
          },
          method: "POST",
          path: "/orders",
          routeId: "post_orders",
        } as never,
      ],
      [
        {
          listenerId: "orders_listener",
          queue: {
            runtime: {
              queueName: "orders-queue",
            },
          },
          target: {
            definitionJson: "{}",
            invocationType: "async",
            kind: "step-function",
            stateMachineName: "orders-listener-flow",
            workflowType: "STANDARD",
          },
        } as never,
      ],
      true,
      true,
    ) as {
      locals: {
        step_function_endpoints: Record<string, unknown>;
        step_function_sqs_listeners: Record<string, unknown>;
      };
    };

    expect(terraformJson.locals.step_function_endpoints.post_orders).toBeDefined();
    expect(terraformJson.locals.step_function_sqs_listeners.orders_listener).toBeDefined();
  });
});
