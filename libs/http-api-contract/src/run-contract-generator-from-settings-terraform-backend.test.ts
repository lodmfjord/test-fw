/** @fileoverview Tests run contract generator from settings terraform backend. @module libs/http-api-contract/src/run-contract-generator-from-settings-terraform-backend.test */
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "bun:test";
import { resetDefinedEndpoints } from "./reset-defined-endpoints";
import { runContractGeneratorFromSettings } from "./run-contract-generator-from-settings";

describe("runContractGeneratorFromSettings terraform backend", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("omits backend block when terraform.state.enabled is false", async () => {
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
          appName: "test-app",
          contractExportName: "contract",
          contractModulePath: "./contract.ts",
          contractsOutputDirectory: "./dist/contracts",
          endpointModulePath: "./endpoints.ts",
          lambdaOutputDirectory: "./dist/lambda-js",
          prefix: "babbstack",
          terraform: {
            enabled: true,
            outputDirectory: "./dist/terraform",
            region: "eu-west-1",
            resources: {
              apiGateway: true,
              dynamodb: false,
              lambdas: false,
              sqs: false,
            },
            state: {
              enabled: false,
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
    expect(providerSource.includes('"backend"')).toBe(false);
    expect(providerSource.includes('"bucket": "')).toBe(false);
    expect(providerSource.includes('"required_providers"')).toBe(true);
  });
});
