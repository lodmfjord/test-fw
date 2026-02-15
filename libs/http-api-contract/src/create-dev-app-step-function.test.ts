/** @fileoverview Tests create dev app step function. @module libs/http-api-contract/src/create-dev-app-step-function.test */
import { describe, expect, it } from "bun:test";
import { schema } from "@babbstack/schema";
import { createDevApp } from "./create-dev-app";
import { definePost } from "./define-post";
import { defineStepFunction } from "@babbstack/step-functions";

describe("createDevApp step-function execution", () => {
  it("executes step-function definitions instead of endpoint handlers", async () => {
    const fetch = createDevApp([
      definePost({
        execution: {
          definition:
            '{"StartAt":"Done","States":{"Done":{"Type":"Pass","Result":{"ok":true},"End":true}}}',
          kind: "step-function",
          stateMachineName: "step-function-demo",
        },
        path: "/step-function-demo",
        request: {
          body: schema.object({
            value: schema.string(),
          }),
        },
        response: schema.object({
          ok: schema.boolean(),
        }),
      }),
    ]);

    const response = await fetch(
      new Request("http://local/step-function-demo", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          value: "demo",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect((await response.json()) as unknown).toEqual({
      ok: true,
    });
  });

  it("returns accepted status for async step-function routes", async () => {
    const fetch = createDevApp([
      definePost({
        execution: {
          definition:
            '{"StartAt":"Done","States":{"Done":{"Type":"Pass","Result":{"ok":true},"End":true}}}',
          invocationType: "async",
          kind: "step-function",
          stateMachineName: "step-function-demo",
        },
        path: "/step-function-demo",
        response: schema.object({
          executionArn: schema.string(),
          status: schema.string(),
        }),
      }),
    ]);

    const response = await fetch(
      new Request("http://local/step-function-demo", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(202);
    const payload = (await response.json()) as { executionArn?: string; status?: string };
    expect(payload.status).toBe("RUNNING");
    expect(payload.executionArn?.startsWith("arn:aws:states:local:")).toBe(true);
  });

  it("executes task and choice states through local task handlers", async () => {
    const flow = defineStepFunction({
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

    const fetch = createDevApp(
      [
        definePost({
          execution: {
            definition: flow,
            kind: "step-function",
            stateMachineName: "step-function-branch-demo",
          },
          path: "/step-function-branch-demo",
          response: schema.object({
            branch: schema.string(),
            random: schema.number(),
          }),
        }),
      ],
      {
        stepFunctionTaskHandlers: {
          "lambda:generate-random-number": () => 73,
          "lambda:handle-high-number": (input) => {
            const payload = input as { random?: number };
            const random = payload.random ?? 0;
            return {
              branch: "high",
              random,
            };
          },
          "lambda:handle-low-number": (input) => {
            const payload = input as { random?: number };
            const random = payload.random ?? 0;
            return {
              branch: "low",
              random,
            };
          },
        },
      },
    );

    const response = await fetch(
      new Request("http://local/step-function-branch-demo", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect((await response.json()) as unknown).toEqual({
      branch: "high",
      random: 73,
    });
  });
});
