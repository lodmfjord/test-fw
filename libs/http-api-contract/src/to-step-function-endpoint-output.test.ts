/**
 * @fileoverview Tests toStepFunctionEndpointOutput behavior.
 */
import { describe, expect, it } from "bun:test";
import { toStepFunctionEndpointOutput } from "./to-step-function-endpoint-output";

describe("toStepFunctionEndpointOutput", () => {
  it("returns accepted execution output for async invocations", async () => {
    const output = await toStepFunctionEndpointOutput(
      {
        execution: {
          definition: {
            StartAt: "Done",
            States: {
              Done: {
                End: true,
                Type: "Succeed",
              },
            },
          },
          definitionJson: "{}",
          invocationType: "async",
          kind: "step-function",
          stateMachineName: "demo",
          workflowType: "STANDARD",
        },
        routeId: "post_demo",
        successStatusCode: 202,
      } as never,
      {
        body: {},
        headers: {},
        method: "POST",
        params: {},
        path: "/demo",
        query: {},
        routeId: "post_demo",
      },
    );

    expect(output.statusCode).toBe(202);
    expect(output.value).toEqual(
      expect.objectContaining({
        status: "RUNNING",
      }),
    );
  });

  it("executes sync step-functions and returns output", async () => {
    const output = await toStepFunctionEndpointOutput(
      {
        execution: {
          definition: {
            StartAt: "Done",
            States: {
              Done: {
                End: true,
                Result: {
                  ok: true,
                },
                Type: "Pass",
              },
            },
          },
          definitionJson: "{}",
          invocationType: "sync",
          kind: "step-function",
          stateMachineName: "demo",
          workflowType: "STANDARD",
        },
        routeId: "post_demo_sync",
        successStatusCode: 200,
      } as never,
      {
        body: {},
        headers: {},
        method: "POST",
        params: {},
        path: "/demo-sync",
        query: {},
        routeId: "post_demo_sync",
      },
    );

    expect(output).toEqual({
      value: {
        ok: true,
      },
    });
  });
});
