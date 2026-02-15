import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "bun:test";
import { createFakeLayerModulesForTest } from "./create-fake-layer-modules-for-test";
import { runContractGeneratorFromSettings } from "./run-contract-generator-from-settings";

function toTerraformReference(expression: string): string {
  return `\${${expression}}`;
}

describe("runContractGeneratorFromSettings terraform", () => {
  it("generates split terraform files with region and workspace-aware state backend", async () => {
    const workspaceDirectory = await mkdtemp(join(tmpdir(), "babbstack-generator-settings-"));
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    const dynamodbImportPath = fileURLToPath(
      new URL("../../dynamodb/src/index.ts", import.meta.url),
    );
    const endpointsPath = join(workspaceDirectory, "endpoints.ts");
    const contractPath = join(workspaceDirectory, "contract.ts");
    const settingsPath = join(workspaceDirectory, "settings.json");
    await createFakeLayerModulesForTest(workspaceDirectory);

    await writeFile(
      endpointsPath,
      `
import { createDynamoDatabase } from "${dynamodbImportPath}";
import { defineGet, schema } from "${frameworkImportPath}";
import { one } from "fake-layer-one";
import { two } from "fake-layer-two";

const usersTable = createDynamoDatabase(
  {
    parse(input) {
      return input;
    },
  },
  "id",
  {
    tableName: "users",
  },
);

const getUsersEndpoint = defineGet({
  path: "/users/{id}",
  context: {
    database: {
      access: ["read"],
      handler: usersTable,
    },
  },
  handler: async ({ database, params }) => {
    const value = await database.read({
      id: params.id,
    });
    return {
      value: value ?? {
        id: \`\${one}-\${two}-\${params.id}\`,
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

const getUsersDetailsEndpoint = defineGet({
  path: "/users/{id}/details",
  handler: ({ params }) => {
    return {
      value: {
        id: \`\${one}-\${two}-\${params.id}\`,
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

export const endpoints = [getUsersEndpoint, [getUsersDetailsEndpoint], getHealthEndpoint];
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
          externalModules: ["fake-layer-one", "fake-layer-two"],
          lambdaOutputDirectory: "./dist/lambda-js",
          prefix: "babbstack",
          terraform: {
            enabled: true,
            outputDirectory: "./dist/terraform",
            region: "eu-west-1",
            resources: {
              apiGateway: true,
              dynamodb: true,
              lambdas: true,
              sqs: false,
            },
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    const output = await runContractGeneratorFromSettings(settingsPath);
    expect(output.terraformFiles).toEqual([
      "api-gateway-lambda-bindings.tf.json",
      "api-gateway.tf.json",
      "dynamodb.tf.json",
      "lambdas.tf.json",
      "provider.tf.json",
    ]);

    const providerSource = await readFile(
      join(workspaceDirectory, "dist/terraform/provider.tf.json"),
      "utf8",
    );
    const apiGatewaySource = await readFile(
      join(workspaceDirectory, "dist/terraform/api-gateway.tf.json"),
      "utf8",
    );
    const lambdaSource = await readFile(
      join(workspaceDirectory, "dist/terraform/lambdas.tf.json"),
      "utf8",
    );
    const dynamodbSource = await readFile(
      join(workspaceDirectory, "dist/terraform/dynamodb.tf.json"),
      "utf8",
    );

    expect(providerSource.includes('"bucket": "babbstack-test-app-terraform-state"')).toBe(true);
    expect(providerSource.includes('"key": "terraform.tfstate"')).toBe(true);
    expect(providerSource.includes('"workspace_key_prefix": "babbstack/test-app"')).toBe(true);
    expect(providerSource.includes('"dynamodb_table": "babbstack-test-app-terraform-locks"')).toBe(
      true,
    );
    expect(providerSource.includes('"default": "eu-west-1"')).toBe(true);
    expect(providerSource.includes('"default": "test-app"')).toBe(true);
    expect(providerSource.includes('"default": "babbstack"')).toBe(true);
    expect(providerSource.includes("terraform.workspace")).toBe(true);
    expect(lambdaSource.includes('"aws_lambda_layer_version"')).toBe(true);
    expect(lambdaSource.includes('"lambda_layer_key_by_route"')).toBe(true);
    expect(lambdaSource.includes('"get_users_param_id": "')).toBe(true);
    expect(lambdaSource.includes('"get_users_param_id_details": "')).toBe(true);
    expect(lambdaSource.includes('"get_health": "')).toBe(true);
    const layerArtifacts = await readdir(
      join(workspaceDirectory, "dist/terraform/layer-artifacts"),
    );
    expect(layerArtifacts.some((fileName) => fileName.endsWith(".zip"))).toBe(true);
    expect(layerArtifacts.includes("source-code-hashes.json")).toBe(true);

    expect(
      apiGatewaySource.includes(
        `"${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.api_name")}"`,
      ),
    ).toBe(true);
    expect(
      lambdaSource.includes(
        `"${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.lambda_function_name_prefix")}${toTerraformReference("each.key")}"`,
      ),
    ).toBe(true);
    expect(
      dynamodbSource.includes(
        `"${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.dynamodb_table_name_prefix")}${toTerraformReference("each.value.name")}"`,
      ),
    ).toBe(true);
  });

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
