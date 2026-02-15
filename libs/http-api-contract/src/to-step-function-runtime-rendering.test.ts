/**
 * @fileoverview Tests step-function runtime rendering source generation.
 */
import { describe, expect, it } from "bun:test";
import { toStepFunctionRuntimeRendering } from "./to-step-function-runtime-rendering";

describe("toStepFunctionRuntimeRendering", () => {
  it("returns undefined for non step-function endpoints", () => {
    const rendering = toStepFunctionRuntimeRendering({
      execution: {
        kind: "lambda",
      },
      method: "GET",
      path: "/health",
      routeId: "get_health",
    } as never);

    expect(rendering).toBeUndefined();
  });

  it("renders support source for step-function endpoints with task handlers", () => {
    const rendering = toStepFunctionRuntimeRendering({
      execution: {
        definition: {
          StartAt: "Generate",
          States: {
            Generate: {
              End: true,
              Resource: "lambda:generate-random-number",
              Type: "Task",
              handler: () => 42,
            },
            RepeatGenerate: {
              End: true,
              Resource: "lambda:generate-random-number",
              Type: "Task",
              handler: () => 99,
            },
          },
        },
        definitionJson: "{}",
        invocationType: "sync",
        kind: "step-function",
        stateMachineName: "demo-state-machine",
        workflowType: "STANDARD",
      },
      method: "POST",
      path: "/step-function-demo",
      routeId: "post_step_function_demo",
    } as never);

    expect(rendering).toBeDefined();
    expect(rendering?.handlerSource).toBe("runStepFunctionEndpoint");
    expect(rendering?.supportSource.includes("stepFunctionResult.output")).toBe(true);
    expect(rendering?.supportSource.includes("endpointStepFunctionTaskHandlers")).toBe(true);
    expect(rendering?.supportSource.match(/"lambda:generate-random-number"/g)).toHaveLength(1);
  });
});
