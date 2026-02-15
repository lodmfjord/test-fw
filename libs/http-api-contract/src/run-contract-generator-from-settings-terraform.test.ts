/**
 * @fileoverview Tests run contract generator from settings terraform.
 */
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "bun:test";
import { runContractGeneratorFromSettings } from "./run-contract-generator-from-settings";

describe("runContractGeneratorFromSettings terraform", () => {
  it("uses contract api name as appName when top-level appName is omitted", async () => {
    const workspaceDirectory = await mkdtemp(join(tmpdir(), "babbstack-generator-settings-"));
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    const endpointsPath = join(workspaceDirectory, "endpoints.ts");
    const contractPath = join(workspaceDirectory, "contract.ts");
    const settingsPath = join(workspaceDirectory, "settings.json");
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
      JSON.stringify(
        {
          contractExportName: "contract",
          contractModulePath: "./contract.ts",
          contractsOutputDirectory: "./dist/contracts",
          endpointModulePath: "./endpoints.ts",
          lambdaOutputDirectory: "./dist/lambda-js",
          terraform: {
            enabled: true,
            outputDirectory: "./dist/terraform",
            resources: {
              apiGateway: true,
              dynamodb: false,
              lambdas: false,
              sqs: false,
            },
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    await runContractGeneratorFromSettings(settingsPath);
    const providerSource = await readFile(
      join(workspaceDirectory, "dist/terraform/provider.tf.json"),
      "utf8",
    );
    expect(providerSource.includes('"bucket": "settings-test-api-terraform-state"')).toBe(true);
    expect(providerSource.includes('"key": "terraform.tfstate"')).toBe(true);
    expect(providerSource.includes('"workspace_key_prefix": "settings-test-api"')).toBe(true);
    expect(providerSource.includes('"dynamodb_table": "settings-test-api-terraform-locks"')).toBe(
      true,
    );
    expect(providerSource.includes('"default": "settings-test-api"')).toBe(true);
    expect(providerSource.includes("terraform.workspace")).toBe(true);
    expect(providerSource.includes('"environment"')).toBe(false);
  });
});
