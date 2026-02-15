/**
 * @fileoverview Tests execute-lambda-js database context behavior.
 */
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { beforeEach, describe, expect, it } from "bun:test";
import { getHandlerFromSource } from "./execute-lambda-js-test-helpers";
import { listDefinedEndpoints } from "./list-defined-endpoints";
import { resetDefinedEndpoints } from "./reset-defined-endpoints";
import { writeLambdaJsFiles } from "./write-lambda-js-files";

describe("generated lambda execution database context", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("enforces read-only context.database for generated lambdas", async () => {
    const endpointModuleDirectory = await mkdtemp(join(tmpdir(), "babbstack-exec-endpoint-"));
    const endpointModulePath = join(endpointModuleDirectory, "endpoints.ts");
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    const dynamodbImportPath = fileURLToPath(
      new URL("../../dynamodb/src/index.ts", import.meta.url),
    );
    await writeFile(
      endpointModulePath,
      `
import { createDynamoDatabase } from "${dynamodbImportPath}";
import { defineGet, schema } from "${frameworkImportPath}";

const usersDatabase = createDynamoDatabase({
  parse(input) {
    return input;
  },
}, "id", {
  tableName: "users",
});

defineGet({
  path: "/users/{id}",
  context: {
    database: {
      access: ["read"],
      handler: usersDatabase,
    },
  },
  handler: async ({ database, params }) => {
    const writer = database;
    await writer.write({
      id: params.id,
      name: "sam",
    });
    return { ok: true };
  },
  request: {
    params: schema.object({
      id: schema.string(),
    }),
  },
  response: schema.object({
    ok: schema.boolean(),
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
    const source = await readFile(join(outputDirectory, "get_users_param_id.mjs"), "utf8");

    const handler = getHandlerFromSource(source);
    const response = await handler({
      body: "",
      headers: {},
      pathParameters: {
        id: "user-1",
      },
      queryStringParameters: {},
    });

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({ error: "Handler execution failed" });
  });
});
