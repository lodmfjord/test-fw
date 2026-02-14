import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "bun:test";
import { runDevAppFromSettings } from "./run-dev-app-from-settings";

describe("runDevAppFromSettings step-function", () => {
  it("loads step-function endpoints without handlers and executes task/choice flow", async () => {
    const workspaceDirectory = await mkdtemp(
      join(tmpdir(), "babbstack-dev-settings-step-function-"),
    );
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    const endpointsPath = join(workspaceDirectory, "endpoints.ts");
    const settingsPath = join(workspaceDirectory, "settings.json");

    await writeFile(
      endpointsPath,
      `
import {
  definePost,
  defineStepFunction,
  schema,
} from "${frameworkImportPath}";

const flow = defineStepFunction({
  StartAt: "GenerateRandom",
  States: {
    GenerateRandom: {
      Type: "Task",
      Resource: "lambda:generate-random-number",
      handler: () => 64,
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
      handler: (input) => {
        const payload = input as { random?: number };
        return {
          branch: "low",
          random: payload.random ?? 0,
        };
      },
      End: true,
    },
    HandleHighNumber: {
      Type: "Task",
      Resource: "lambda:handle-high-number",
      handler: (input) => {
        const payload = input as { random?: number };
        return {
          branch: "high",
          random: payload.random ?? 0,
        };
      },
      End: true,
    },
  },
});

const endpoint = definePost({
  execution: {
    definition: flow,
    kind: "step-function",
    stateMachineName: "branch-flow",
  },
  path: "/step-function-random-branch",
  response: schema.object({
    branch: schema.string(),
    random: schema.number(),
  }),
});

export const endpoints = [endpoint];
`,
      "utf8",
    );

    await writeFile(
      settingsPath,
      JSON.stringify(
        {
          endpointModulePath: "./endpoints.ts",
        },
        null,
        2,
      ),
      "utf8",
    );

    let served:
      | {
          fetch: (request: Request) => Promise<Response>;
          port: number;
        }
      | undefined;

    await runDevAppFromSettings(settingsPath, {
      env: {
        PORT: "4323",
      },
      log() {},
      serve(input) {
        served = {
          fetch: input.fetch,
          port: input.port,
        };
      },
    });

    if (!served) {
      throw new Error("Expected dev server to start");
    }

    const response = await served.fetch(
      new Request("http://local/step-function-random-branch", { method: "POST" }),
    );
    expect(response.status).toBe(200);
    expect((await response.json()) as unknown).toEqual({
      branch: "high",
      random: 64,
    });
  });
});
