/**
 * @fileoverview Tests run dev app from settings.
 */
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "bun:test";
import type { Logger } from "@babbstack/logger";
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

  it("prefers options.logger over options.log", async () => {
    const workspaceDirectory = await mkdtemp(join(tmpdir(), "babbstack-dev-settings-"));
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    const endpointsPath = join(workspaceDirectory, "endpoints.ts");
    const settingsPath = join(workspaceDirectory, "settings.json");

    await writeFile(
      endpointsPath,
      `
import { defineGet, schema } from "${frameworkImportPath}";

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

export const endpoints = [helloEndpoint];
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

    const logMessages: string[] = [];
    const loggerMessages: string[] = [];
    const logger: Logger = {
      debug(message) {
        loggerMessages.push(message);
      },
      error(message) {
        loggerMessages.push(message);
      },
      getPersistentKeys() {
        return {};
      },
      info(message) {
        loggerMessages.push(message);
      },
      warn(message) {
        loggerMessages.push(message);
      },
    };

    await runDevAppFromSettings(settingsPath, {
      env: {
        PORT: "4323",
      },
      log(message) {
        logMessages.push(message);
      },
      logger,
      serve() {},
    });

    expect(logMessages).toEqual([]);
    expect(loggerMessages.includes("babbstack dev server listening on http://localhost:4323")).toBe(
      true,
    );
  });
});
