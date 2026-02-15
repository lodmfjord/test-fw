/**
 * @fileoverview Tests run-dev-app-from-settings sqs listener behavior.
 */
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "bun:test";
import { runDevAppFromSettings } from "./run-dev-app-from-settings";

describe("runDevAppFromSettings sqs", () => {
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
