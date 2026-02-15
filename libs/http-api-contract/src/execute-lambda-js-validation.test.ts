/**
 * @fileoverview Tests execute lambda js validation.
 */
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { beforeEach, describe, expect, it } from "bun:test";
import { listDefinedEndpoints } from "./list-defined-endpoints";
import { resetDefinedEndpoints } from "./reset-defined-endpoints";
import { writeLambdaJsFiles } from "./write-lambda-js-files";

type LambdaLikeEvent = {
  body?: string;
  headers?: Record<string, string>;
  pathParameters?: Record<string, string>;
  queryStringParameters?: Record<string, string>;
};

type LambdaLikeResponse = {
  body: string;
  headers: Record<string, string>;
  statusCode: number;
};

/** Gets handler from source. */
function getHandlerFromSource(
  source: string,
): (event: LambdaLikeEvent) => Promise<LambdaLikeResponse> {
  const sourceWithoutZodImport = source.replace(
    /import\s+\{\s*z\s+as\s+simpleApiZod\s*\}\s+from\s+["']zod["'];?\s*/g,
    'const { z: simpleApiZod } = require("zod");\n',
  );
  const sourceWithoutLoggerImport = sourceWithoutZodImport.replace(
    /import\s+\{\s*Logger\s+as\s+simpleApiPowertoolsLogger\s*\}\s+from\s+["']@aws-lambda-powertools\/logger["'];?\s*/g,
    'const { Logger: simpleApiPowertoolsLogger } = require("@aws-lambda-powertools/logger");\n',
  );
  if (/^\s*import\s/m.test(sourceWithoutLoggerImport)) {
    throw new Error("Imports are forbidden in enclosed lambda runtime");
  }

  const transformedSource = sourceWithoutLoggerImport
    .replace(/export\s+async\s+function\s+handler\s*\(/, "async function handler(")
    .replace(/export\s*\{\s*handler\s*\};?/g, "");
  const runtimeRequire = createRequire(import.meta.url);

  const factory = new Function("require", `${transformedSource}\nreturn handler;`) as (
    runtimeRequire: (moduleName: string) => unknown,
  ) => (event: LambdaLikeEvent) => Promise<LambdaLikeResponse>;

  return factory(runtimeRequire);
}

describe("generated lambda execution validation", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("returns 400 when request input does not match endpoint schema", async () => {
    const endpointModuleDirectory = await mkdtemp(join(tmpdir(), "babbstack-exec-endpoint-"));
    const endpointModulePath = join(endpointModuleDirectory, "endpoints.ts");
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    await writeFile(
      endpointModulePath,
      `
import { definePost, schema } from "${frameworkImportPath}";

definePost({
  path: "/users",
  handler: async ({ body }) => ({
    value: {
      id: "user-" + body.name,
    },
  }),
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
      body: JSON.stringify({ name: 1 }),
      headers: {},
      pathParameters: {},
      queryStringParameters: {},
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      error: "body.name: expected string",
    });
  });

  it("returns 500 when handler output does not match response schema", async () => {
    const endpointModuleDirectory = await mkdtemp(join(tmpdir(), "babbstack-exec-endpoint-"));
    const endpointModulePath = join(endpointModuleDirectory, "endpoints.ts");
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    await writeFile(
      endpointModulePath,
      `
import { defineGet, schema } from "${frameworkImportPath}";

defineGet({
  path: "/users/{id}",
  handler: async ({ params }) => ({
    value: {
      id: 123,
      name: params.id,
    },
  }),
  request: {
    params: schema.object({
      id: schema.string(),
    }),
  },
  response: schema.object({
    id: schema.string(),
    name: schema.string(),
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
    expect(JSON.parse(response.body)).toEqual({
      error: "Output validation failed",
    });
  });

  it("uses zod-backed constraints from schema.fromZod for request validation", async () => {
    const endpointModuleDirectory = await mkdtemp(join(tmpdir(), "babbstack-exec-endpoint-"));
    const endpointModulePath = join(endpointModuleDirectory, "endpoints.ts");
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    await writeFile(
      endpointModulePath,
      `
import { definePost, schema } from "${frameworkImportPath}";

const minThreeChars = schema.fromZod((schema.string().zodSchema).min(3));

definePost({
  path: "/users",
  handler: async ({ body }) => ({
    value: {
      name: body.name,
    },
  }),
  request: {
    body: schema.object({
      name: minThreeChars,
    }),
  },
  response: schema.object({
    name: schema.string(),
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
      body: JSON.stringify({ name: "ab" }),
      headers: {},
      pathParameters: {},
      queryStringParameters: {},
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      error: "body.name: Too small: expected string to have >=3 characters",
    });
  });
});
