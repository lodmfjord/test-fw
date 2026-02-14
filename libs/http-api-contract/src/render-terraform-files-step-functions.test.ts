import { beforeEach, describe, expect, it } from "bun:test";
import { createSqsQueue, listDefinedSqsListeners, resetDefinedSqsListeners } from "@babbstack/sqs";
import { schema } from "@babbstack/schema";
import { buildContractFromEndpoints } from "./build-contract-from-endpoints";
import { defineGet } from "./define-get";
import { listDefinedEndpoints } from "./list-defined-endpoints";
import { renderTerraformFiles } from "./render-terraform-files";
import { resetDefinedEndpoints } from "./reset-defined-endpoints";

const STEP_FUNCTION_DEFINITION = JSON.stringify({
  StartAt: "Done",
  States: {
    Done: {
      Type: "Succeed",
    },
  },
});

describe("renderTerraformFiles step functions", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
    resetDefinedSqsListeners();
  });

  it("renders step function resources for endpoint and sqs listener targets", () => {
    const queue = createSqsQueue(
      {
        parse(input: unknown) {
          const source = input as { userId?: unknown };
          if (typeof source.userId !== "string") {
            throw new Error("invalid message");
          }

          return {
            userId: source.userId,
          };
        },
      },
      {
        queueName: "step-function-events",
      },
    );

    queue.addListener({
      listenerId: "step_function_events_listener",
      target: {
        definition: STEP_FUNCTION_DEFINITION,
        kind: "step-function",
        stateMachineName: "step-function-events-listener",
      },
    });

    defineGet({
      execution: {
        definition: STEP_FUNCTION_DEFINITION,
        kind: "step-function",
        stateMachineName: "get-step-health",
      },
      path: "/step-health",
      response: schema.object({
        status: schema.string(),
      }),
    });

    defineGet({
      path: "/health",
      handler: () => ({
        value: {
          status: "ok",
        },
      }),
      response: schema.object({
        status: schema.string(),
      }),
    });

    const endpoints = listDefinedEndpoints();
    const listeners = listDefinedSqsListeners();
    const contract = buildContractFromEndpoints({
      apiName: "terraform-step-functions-test",
      endpoints,
      version: "1.0.0",
    });

    const files = renderTerraformFiles(contract, endpoints, listeners, {
      appName: "test-app",
      prefix: "babbstack",
      region: "eu-west-1",
      resources: {
        apiGateway: true,
        dynamodb: false,
        lambdas: true,
        sqs: true,
        stepFunctions: true,
      },
    });

    const lambdaSource = files["lambdas.tf.json"] ?? "";
    const stepFunctionSource = files["step-functions.tf.json"] ?? "";

    expect(files["step-functions.tf.json"]).toBeDefined();
    expect(stepFunctionSource.includes('"aws_sfn_state_machine"')).toBe(true);
    expect(stepFunctionSource.includes('"aws_pipes_pipe"')).toBe(true);
    expect(stepFunctionSource.includes("StepFunctions-StartSyncExecution")).toBe(true);
    expect(stepFunctionSource.includes('"FIRE_AND_FORGET"')).toBe(true);
    expect(stepFunctionSource.includes('"get_step_health"')).toBe(true);
    expect(stepFunctionSource.includes('"step_function_events_listener"')).toBe(true);
    expect(lambdaSource.includes('"get_health"')).toBe(true);
    expect(lambdaSource.includes('"get_step_health"')).toBe(false);
  });
});
