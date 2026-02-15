/**
 * @fileoverview Tests toStepFunctionEndpoints behavior.
 */
import { describe, expect, it } from "bun:test";
import { toStepFunctionEndpoints } from "./to-step-function-endpoints";

describe("toStepFunctionEndpoints", () => {
  it("maps step-function endpoints and excludes lambda endpoints", () => {
    const endpoints = toStepFunctionEndpoints([
      {
        execution: {
          definitionJson: "{}",
          invocationType: "sync",
          kind: "step-function",
          stateMachineName: "sync-flow",
          workflowType: "EXPRESS",
        },
        method: "POST",
        path: "/flow",
        routeId: "post_flow",
      } as never,
      {
        execution: {
          kind: "lambda",
        },
        method: "GET",
        path: "/health",
        routeId: "get_health",
      } as never,
    ]);

    expect(endpoints).toEqual({
      post_flow: {
        definition: "{}",
        integration_subtype: "StepFunctions-StartSyncExecution",
        invocation_type: "sync",
        lambda_resource_arns: [],
        method: "POST",
        path: "/flow",
        start_action: "states:StartSyncExecution",
        state_machine_name: "sync-flow",
        workflow_type: "EXPRESS",
      },
    });
  });
});
