/**
 * @fileoverview Tests run contract generator from settings.
 */
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "bun:test";
import { runContractGeneratorFromSettings } from "./run-contract-generator-from-settings";

describe("runContractGeneratorFromSettings", () => {
  it("generates contract files and lambda files from a settings json file", async () => {
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
        },
        null,
        2,
      ),
      "utf8",
    );

    const output = await runContractGeneratorFromSettings(settingsPath);

    expect(output.contractFiles).toEqual([
      "deploy.contract.json",
      "env.schema.json",
      "lambdas.manifest.json",
      "openapi.json",
      "routes.manifest.json",
    ]);
    expect(output.lambdaFiles).toEqual(["get_health.mjs"]);

    const openApiSource = await readFile(
      join(workspaceDirectory, "dist/contracts/openapi.json"),
      "utf8",
    );
    const lambdaSource = await readFile(
      join(workspaceDirectory, "dist/lambda-js/get_health.mjs"),
      "utf8",
    );

    expect(openApiSource.includes('"title": "settings-test-api"')).toBe(true);
    expect(lambdaSource.includes("Handler execution failed")).toBe(true);
  });

  it("supports external modules from settings json", async () => {
    const workspaceDirectory = await mkdtemp(join(tmpdir(), "babbstack-generator-settings-"));
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    const endpointsPath = join(workspaceDirectory, "endpoints.ts");
    const contractPath = join(workspaceDirectory, "contract.ts");
    const settingsPath = join(workspaceDirectory, "settings.json");

    await writeFile(
      endpointsPath,
      `
import { defineGet, schema } from "${frameworkImportPath}";

const getUsersEndpoint = defineGet({
  path: "/users/{id}",
  handler: async ({ db, params }) => {
    const value = await db.read({
      key: {
        id: params.id,
      },
      tableName: "users",
    });
    return {
      value: {
        id: String(value?.id ?? params.id),
      },
    };
  },
  request: {
    params: schema.object({
      id: schema.string(),
    }),
  },
  response: schema.object({
    id: schema.string(),
  }),
});

export const endpoints = [getUsersEndpoint];
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
          externalModules: ["@aws-sdk/client-dynamodb", "@aws-sdk/util-dynamodb"],
          lambdaOutputDirectory: "./dist/lambda-js",
        },
        null,
        2,
      ),
      "utf8",
    );

    await runContractGeneratorFromSettings(settingsPath);

    const lambdaSource = await readFile(
      join(workspaceDirectory, "dist/lambda-js/get_users_param_id.mjs"),
      "utf8",
    );

    expect(lambdaSource.includes('from "@aws-sdk/client-dynamodb";')).toBe(true);
    expect(lambdaSource.includes('from "@aws-sdk/util-dynamodb";')).toBe(true);
    expect(lambdaSource.includes("@smithy/")).toBe(false);
  });
});
