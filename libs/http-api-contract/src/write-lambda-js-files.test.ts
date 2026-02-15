/**
 * @fileoverview Tests write lambda js files.
 */
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "bun:test";
import { listDefinedEndpoints } from "./list-defined-endpoints";
import { resetDefinedEndpoints } from "./reset-defined-endpoints";
import type { EndpointRuntimeDefinition } from "./types";
import { writeLambdaJsFiles } from "./write-lambda-js-files";

describe("writeLambdaJsFiles", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("writes bundled lambda js files to disk", async () => {
    const endpointModuleDirectory = await mkdtemp(join(tmpdir(), "babbstack-endpoint-module-"));
    const endpointModulePath = join(endpointModuleDirectory, "endpoints.ts");
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    await writeFile(
      endpointModulePath,
      `
import { defineGet, schema } from "${frameworkImportPath}";

defineGet({
  path: "/health",
  handler: () => ({ status: "ok" }),
  response: schema.object({
    status: schema.string(),
  }),
});
`,
      "utf8",
    );

    await import(pathToFileURL(endpointModulePath).href);
    const outputDirectory = await mkdtemp(join(tmpdir(), "babbstack-lambda-js-"));
    const fileNames = await writeLambdaJsFiles(outputDirectory, listDefinedEndpoints(), {
      endpointModulePath,
      frameworkImportPath,
    });

    expect(fileNames).toEqual(["get_health.mjs"]);

    const source = await readFile(join(outputDirectory, "get_health.mjs"), "utf8");
    expect(source.includes('import { z as simpleApiZod } from "zod";')).toBe(true);
    expect(
      source.includes(
        'import { Logger as simpleApiPowertoolsLogger } from "@aws-lambda-powertools/logger";',
      ),
    ).toBe(true);
    expect(source.includes("Handler execution failed")).toBe(true);
    expect(source.includes('const dynamoClientModuleName = "@aws-sdk/client-dynamodb";')).toBe(
      false,
    );
    expect(source.includes('const dynamoUtilModuleName = "@aws-sdk/util-dynamodb";')).toBe(false);
    expect(source.includes("await import(dynamoClientModuleName)")).toBe(false);
    expect(source.includes("await import(dynamoUtilModuleName)")).toBe(false);
    expect(source.includes('runtimeRequire("@aws-sdk/client-dynamodb")')).toBe(false);
    expect(source.includes('runtimeRequire("@aws-sdk/util-dynamodb")')).toBe(false);
    expect(source.includes("createSimpleApiRuntimeDynamoDb")).toBe(false);
    expect(source.includes("@aws-sdk/client-dynamodb")).toBe(false);
    expect(source.includes("export")).toBe(true);
  });

  it("supports external aws sdk modules for layer-based lambdas", async () => {
    const endpointModuleDirectory = await mkdtemp(join(tmpdir(), "babbstack-endpoint-module-"));
    const endpointModulePath = join(endpointModuleDirectory, "endpoints.ts");
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    await writeFile(
      endpointModulePath,
      `
import { defineGet, schema } from "${frameworkImportPath}";

defineGet({
  path: "/users/{id}",
  handler: async ({ db, params }) => {
    const value = await db.read({
      key: { id: params.id },
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
`,
      "utf8",
    );

    await import(pathToFileURL(endpointModulePath).href);
    const outputDirectory = await mkdtemp(join(tmpdir(), "babbstack-lambda-js-"));
    const fileNames = await writeLambdaJsFiles(outputDirectory, listDefinedEndpoints(), {
      endpointModulePath,
      externalModules: ["@aws-sdk/client-dynamodb", "@aws-sdk/util-dynamodb"],
      frameworkImportPath,
    });

    expect(fileNames).toEqual(["get_users_param_id.mjs"]);

    const source = await readFile(join(outputDirectory, "get_users_param_id.mjs"), "utf8");
    expect(source.includes("@aws-sdk/client-dynamodb")).toBe(true);
    expect(source.includes("@aws-sdk/util-dynamodb")).toBe(true);
    expect(source.includes("@smithy/")).toBe(false);
    expect(source.includes("node_modules/.bun/@aws-sdk+client-dynamodb")).toBe(false);
  });

  it("keeps required runtime modules as external imports in generated lambdas", async () => {
    const endpointModuleDirectory = await mkdtemp(join(tmpdir(), "babbstack-endpoint-module-"));
    const endpointModulePath = join(endpointModuleDirectory, "endpoints.ts");
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    await writeFile(
      endpointModulePath,
      `
import { defineGet, schema } from "${frameworkImportPath}";

defineGet({
  path: "/health",
  handler: async () => ({ value: { status: "ok" } }),
  response: schema.object({
    status: schema.string(),
  }),
});
`,
      "utf8",
    );

    await import(pathToFileURL(endpointModulePath).href);
    const outputDirectory = await mkdtemp(join(tmpdir(), "babbstack-lambda-js-"));
    await writeLambdaJsFiles(outputDirectory, listDefinedEndpoints(), {
      endpointModulePath,
      frameworkImportPath,
    });
    const source = await readFile(join(outputDirectory, "get_health.mjs"), "utf8");

    expect(source.includes('from "zod"')).toBe(true);
    expect(source.includes('from "@aws-lambda-powertools/logger"')).toBe(true);
    expect(source.includes("node_modules/zod")).toBe(false);
    expect(source.includes("node_modules/@aws-lambda-powertools/logger")).toBe(false);
  });

  it("rejects endpoints with colliding route ids", async () => {
    const endpointModuleDirectory = await mkdtemp(join(tmpdir(), "babbstack-endpoint-module-"));
    const endpointModulePath = join(endpointModuleDirectory, "endpoints.ts");
    await writeFile(endpointModulePath, "export const noop = true;\n", "utf8");

    const outputDirectory = await mkdtemp(join(tmpdir(), "babbstack-lambda-js-"));
    const collidingEndpoints = [
      {
        auth: "none",
        handler: () => ({ value: { status: "ok" } }),
        handlerId: "get_users_roles_handler_a",
        method: "GET",
        operationId: "getUsersRolesA",
        path: "/users-roles",
        request: {},
        response: {
          jsonSchema: { type: "object" },
          optional: false,
          parse(input: unknown) {
            return input as { status: string };
          },
        },
        routeId: "get_users_roles",
        tags: [],
      },
      {
        auth: "none",
        handler: () => ({ value: { status: "ok" } }),
        handlerId: "get_users_roles_handler_b",
        method: "GET",
        operationId: "getUsersRolesB",
        path: "/users_roles",
        request: {},
        response: {
          jsonSchema: { type: "object" },
          optional: false,
          parse(input: unknown) {
            return input as { status: string };
          },
        },
        routeId: "get_users_roles",
        tags: [],
      },
    ] as unknown as EndpointRuntimeDefinition[];

    await expect(
      writeLambdaJsFiles(outputDirectory, collidingEndpoints, {
        endpointModulePath,
      }),
    ).rejects.toThrow('Route ID collision: "get_users_roles"');
  });
});
