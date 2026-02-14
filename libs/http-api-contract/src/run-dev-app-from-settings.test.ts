import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "bun:test";
import { runDevAppFromSettings } from "./run-dev-app-from-settings";

describe("runDevAppFromSettings", () => {
  it("starts dev app from settings endpoint entrypoint export", async () => {
    const workspaceDirectory = await mkdtemp(join(tmpdir(), "babbstack-dev-settings-"));
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    const endpointsPath = join(workspaceDirectory, "endpoints.ts");
    const settingsPath = join(workspaceDirectory, "settings.json");

    await writeFile(
      endpointsPath,
      `
import { defineGet, schema } from "${frameworkImportPath}";

const healthEndpoint = defineGet({
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

const helloEndpoint = defineGet({
  path: "/hello",
  handler: () => ({
    value: {
      hello: "world",
    },
  }),
  response: schema.object({
    hello: schema.string(),
  }),
});

export const endpoints = [[healthEndpoint], helloEndpoint];
`,
      "utf8",
    );

    await writeFile(
      settingsPath,
      JSON.stringify(
        {
          contractExportName: "contract",
          contractModulePath: "./contract.ts",
          contractsOutputDirectory: "./dist/contracts",
          endpointModulePath: "./endpoints.ts",
          lambdaOutputDirectory: "./dist/lambda-js",
        },
        null,
        2,
      ),
      "utf8",
    );

    const logs: string[] = [];
    let served:
      | {
          fetch: (request: Request) => Promise<Response>;
          port: number;
        }
      | undefined;

    const port = await runDevAppFromSettings(settingsPath, {
      env: {
        PORT: "4321",
      },
      log(message) {
        logs.push(message);
      },
      serve(input) {
        served = {
          fetch: input.fetch,
          port: input.port,
        };
      },
    });

    expect(port).toBe(4321);
    expect(served?.port).toBe(4321);
    expect(logs).toEqual(["babbstack dev server listening on http://localhost:4321"]);

    if (!served) {
      throw new Error("Expected dev server to start");
    }

    const response = await served.fetch(new Request("http://local/hello", { method: "GET" }));
    expect(response.status).toBe(200);
    expect((await response.json()) as { hello?: string }).toEqual({
      hello: "world",
    });
  });

  it("runs local sqs listeners while dev app is running", async () => {
    const workspaceDirectory = await mkdtemp(join(tmpdir(), "babbstack-dev-settings-"));
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    const sqsImportPath = fileURLToPath(new URL("../../sqs/src/index.ts", import.meta.url));
    const endpointsPath = join(workspaceDirectory, "endpoints.ts");
    const settingsPath = join(workspaceDirectory, "settings.json");

    await writeFile(
      endpointsPath,
      `
import { defineGet, schema } from "${frameworkImportPath}";
import { createSqsQueue } from "${sqsImportPath}";

let lastUpdate = "boot";
const queue = createSqsQueue(
  {
    parse(input) {
      return input;
    },
  },
  {
    queueName: "last-update-events",
  },
);

queue.addListener({
  listenerId: "last_update",
  handler: ({ message }) => {
    lastUpdate = String(message.time ?? lastUpdate);
  },
});

const endpoint = defineGet({
  path: "/last-update",
  context: {
    sqs: {
      handler: queue,
    },
  },
  handler: async ({ sqs }) => {
    if (!sqs) {
      throw new Error("missing sqs");
    }

    await sqs.send({
      time: "updated",
    });

    return {
      value: {
        time: lastUpdate,
      },
    };
  },
  response: schema.object({
    time: schema.string(),
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
        PORT: "4322",
      },
      listenerPollMs: 10,
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

    const firstResponse = await served.fetch(
      new Request("http://local/last-update", { method: "GET" }),
    );
    expect(firstResponse.status).toBe(200);
    expect((await firstResponse.json()) as { time?: string }).toEqual({ time: "boot" });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const secondResponse = await served.fetch(
      new Request("http://local/last-update", { method: "GET" }),
    );
    expect(secondResponse.status).toBe(200);
    expect((await secondResponse.json()) as { time?: string }).toEqual({ time: "updated" });
  });
});
