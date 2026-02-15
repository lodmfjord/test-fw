/** @fileoverview Tests run contract generator from settings endpoint entrypoint. @module libs/http-api-contract/src/run-contract-generator-from-settings-endpoint-entrypoint.test */
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "bun:test";
import { resetDefinedEndpoints } from "./reset-defined-endpoints";
import { runContractGeneratorFromSettings } from "./run-contract-generator-from-settings";

describe("runContractGeneratorFromSettings endpoint entrypoint", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("loads endpoints from endpoint entrypoint export and flattens nested arrays", async () => {
    const workspaceDirectory = await mkdtemp(join(tmpdir(), "babbstack-generator-settings-"));
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    const endpointsPath = join(workspaceDirectory, "endpoints.ts");
    const contractPath = join(workspaceDirectory, "contract.ts");
    const settingsPath = join(workspaceDirectory, "settings.json");

    await writeFile(
      endpointsPath,
      `
import { defineGet, resetDefinedEndpoints, schema } from "${frameworkImportPath}";

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

export const endpoints = [[healthEndpoint]];
resetDefinedEndpoints();
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

    expect(output.contractFiles.includes("openapi.json")).toBe(true);
    expect(output.lambdaFiles).toEqual(["get_health.mjs"]);
  });
});
