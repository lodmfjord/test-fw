/**
 * @fileoverview Tests execute lambda js.
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

describe("generated lambda execution", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("executes bundled lambda source and returns expected response", async () => {
    const endpointModuleDirectory = await mkdtemp(join(tmpdir(), "babbstack-exec-endpoint-"));
    const endpointModulePath = join(endpointModuleDirectory, "endpoints.ts");
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    await writeFile(
      endpointModulePath,
      `
import { definePost, schema } from "${frameworkImportPath}";

definePost({
  path: "/users",
  handler: async ({ body, db }) => {
    const id = "user-" + body.name;
    await db.write({
      item: {
        name: body.name,
      },
      key: {
        id,
      },
      tableName: "users",
    });
    const savedUser = await db.read({
      key: {
        id,
      },
      tableName: "users",
    });

    return {
      statusCode: 201,
      value: { id: String(savedUser?.id ?? "") },
    };
  },
  request: {
    body: schema.object({
      name: schema.string(),
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
    await writeLambdaJsFiles(outputDirectory, listDefinedEndpoints(), {
      endpointModulePath,
      frameworkImportPath,
    });
    const source = await readFile(join(outputDirectory, "post_users.mjs"), "utf8");

    const handler = getHandlerFromSource(source);
    const response = await handler({
      body: JSON.stringify({ name: "sam" }),
      headers: {},
      pathParameters: {},
      queryStringParameters: {},
    });

    expect(response.statusCode).toBe(201);
    expect(response.headers["content-type"]).toBe("application/json");
    expect(JSON.parse(response.body)).toEqual({ id: "user-sam" });
  });

  it("rejects lambda source with import statements", () => {
    const source = `
      import { something } from "x";
      export async function handler() {
        return { statusCode: 200, headers: {}, body: "{}" };
      }
    `;

    expect(() => getHandlerFromSource(source)).toThrow("Imports are forbidden");
  });

  it("enforces read-only db access for generated lambdas", async () => {
    const endpointModuleDirectory = await mkdtemp(join(tmpdir(), "babbstack-exec-endpoint-"));
    const endpointModulePath = join(endpointModuleDirectory, "endpoints.ts");
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    await writeFile(
      endpointModulePath,
      `
import { defineGet, schema } from "${frameworkImportPath}";

defineGet({
  access: {
    db: "read",
  },
  path: "/users",
  handler: async ({ db }) => {
    const writer = db;
    await writer.write({
      item: {
        name: "sam",
      },
      key: {
        id: "user-1",
      },
      tableName: "users",
    });
    return { ok: true };
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
    const source = await readFile(join(outputDirectory, "get_users.mjs"), "utf8");

    const handler = getHandlerFromSource(source);
    const capturedErrors: Array<Record<string, unknown>> = [];
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      if (args.length > 0 && args[0] && typeof args[0] === "object") {
        capturedErrors.push(args[0] as Record<string, unknown>);
      }
    };
    const response = await handler({
      body: "",
      headers: {},
      pathParameters: {},
      queryStringParameters: {},
    });
    console.error = originalConsoleError;

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({ error: "Handler execution failed" });
    expect(
      capturedErrors.some(
        (entry) =>
          entry.event === "lambda.handler.failed" &&
          entry.method === "GET" &&
          entry.path === "/users",
      ),
    ).toBe(true);
  });
});
