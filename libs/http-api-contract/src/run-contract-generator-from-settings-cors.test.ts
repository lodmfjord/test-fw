/**
 * @fileoverview Tests run contract generator from settings cors.
 */
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "bun:test";
import { runContractGeneratorFromSettings } from "./run-contract-generator-from-settings";

describe("runContractGeneratorFromSettings cors", () => {
  it("generates one OPTIONS lambda per path when contract global cors is enabled", async () => {
    const workspaceDirectory = await mkdtemp(join(tmpdir(), "babbstack-generator-settings-"));
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    const endpointsPath = join(workspaceDirectory, "endpoints.ts");
    const contractPath = join(workspaceDirectory, "contract.ts");
    const settingsPath = join(workspaceDirectory, "settings.json");

    await writeFile(
      endpointsPath,
      `
import { defineGet, definePost, schema } from "${frameworkImportPath}";

const getUsersEndpoint = defineGet({
  path: "/users",
  handler: () => ({
    value: {
      source: "get",
    },
  }),
  response: schema.object({
    source: schema.string(),
  }),
});

const postUsersEndpoint = definePost({
  path: "/users",
  handler: () => ({
    value: {
      source: "post",
    },
  }),
  response: schema.object({
    source: schema.string(),
  }),
});

export const endpoints = [getUsersEndpoint, postUsersEndpoint];
`,
      "utf8",
    );
    await writeFile(
      contractPath,
      `
import { buildContractFromEndpoints } from "${frameworkImportPath}";
import { endpoints } from "./endpoints";

export const contract = buildContractFromEndpoints({
  apiName: "settings-test-api",
  cors: {
    allowOrigin: "https://app.example.com",
  },
  version: "1.0.0",
  endpoints: endpoints.flat(),
});
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

    const output = await runContractGeneratorFromSettings(settingsPath);
    expect(output.lambdaFiles).toEqual(["get_users.mjs", "options_users.mjs", "post_users.mjs"]);

    const routesSource = await readFile(
      join(workspaceDirectory, "dist/contracts/routes.manifest.json"),
      "utf8",
    );
    expect(routesSource.includes('"method": "OPTIONS"')).toBe(true);
    expect(routesSource.includes('"path": "/users"')).toBe(true);
  });
});
