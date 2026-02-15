/**
 * @fileoverview Tests run-contract-generator-from-settings jsonc behavior.
 */
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "bun:test";
import { runContractGeneratorFromSettings } from "./run-contract-generator-from-settings";

describe("runContractGeneratorFromSettings jsonc", () => {
  it("supports jsonc settings files with comments and trailing commas", async () => {
    const workspaceDirectory = await mkdtemp(join(tmpdir(), "babbstack-generator-settings-"));
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    const endpointsPath = join(workspaceDirectory, "endpoints.ts");
    const contractPath = join(workspaceDirectory, "contract.ts");
    const settingsPath = join(workspaceDirectory, "settings.jsonc");

    await writeFile(
      endpointsPath,
      `
import { defineGet, schema } from "${frameworkImportPath}";

const getHealthEndpoint = defineGet({
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

export const endpoints = [getHealthEndpoint];
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
  version: "1.0.0",
  endpoints: endpoints.flat(),
});
`,
      "utf8",
    );
    await writeFile(
      settingsPath,
      `{
  // JSONC should be accepted for settings
  "contractExportName": "contract",
  "contractModulePath": "./contract.ts",
  "contractsOutputDirectory": "./dist/contracts",
  "endpointModulePath": "./endpoints.ts",
  "lambdaOutputDirectory": "./dist/lambda-js", // trailing comma is valid in JSONC
}
`,
      "utf8",
    );

    const output = await runContractGeneratorFromSettings(settingsPath);

    expect(output.contractFiles.includes("openapi.json")).toBe(true);
    expect(output.lambdaFiles).toEqual(["get_health.mjs"]);
  });
});
