/**
 * @fileoverview Tests execute lambda js zod parity.
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
  if (/^\s*import\s/m.test(sourceWithoutZodImport)) {
    throw new Error("Imports are forbidden in enclosed lambda runtime");
  }

  const transformedSource = sourceWithoutZodImport
    .replace(/export\s+async\s+function\s+handler\s*\(/, "async function handler(")
    .replace(/export\s*\{\s*handler\s*\};?/g, "");
  const runtimeRequire = createRequire(import.meta.url);

  const factory = new Function("require", `${transformedSource}\nreturn handler;`) as (
    runtimeRequire: (moduleName: string) => unknown,
  ) => (event: LambdaLikeEvent) => Promise<LambdaLikeResponse>;

  return factory(runtimeRequire);
}

describe("generated lambda zod parity", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("validates recursive $ref schemas from schema.fromZod", async () => {
    const endpointModuleDirectory = await mkdtemp(join(tmpdir(), "babbstack-exec-endpoint-"));
    const endpointModulePath = join(endpointModuleDirectory, "endpoints.ts");
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    const zodImportPath = fileURLToPath(new URL("../node_modules/zod/index.js", import.meta.url));
    await writeFile(
      endpointModulePath,
      `
import { definePost, schema } from "${frameworkImportPath}";
import { z } from "${zodImportPath}";

const treeNode = z.object({
  children: z.array(z.lazy(() => treeNode)).optional(),
  name: z.string(),
});

definePost({
  path: "/tree",
  handler: async ({ body }) => ({
    value: {
      name: body.name,
    },
  }),
  request: {
    body: schema.fromZod(treeNode),
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
    const source = await readFile(join(outputDirectory, "post_tree.mjs"), "utf8");

    const handler = getHandlerFromSource(source);
    const response = await handler({
      body: JSON.stringify({
        children: [{ name: 123 }],
        name: "root",
      }),
      headers: {},
      pathParameters: {},
      queryStringParameters: {},
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      error: "body.children.0.name: expected string",
    });
  });

  it("applies schema.fromZod default values during request validation", async () => {
    const endpointModuleDirectory = await mkdtemp(join(tmpdir(), "babbstack-exec-endpoint-"));
    const endpointModulePath = join(endpointModuleDirectory, "endpoints.ts");
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    const zodImportPath = fileURLToPath(new URL("../node_modules/zod/index.js", import.meta.url));
    await writeFile(
      endpointModulePath,
      `
import { definePost, schema } from "${frameworkImportPath}";
import { z } from "${zodImportPath}";

definePost({
  path: "/defaults",
  handler: async ({ body }) => ({
    value: {
      name: body.name,
    },
  }),
  request: {
    body: schema.fromZod(z.object({
      name: z.string().default("sam"),
    })),
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
    const source = await readFile(join(outputDirectory, "post_defaults.mjs"), "utf8");

    const handler = getHandlerFromSource(source);
    const response = await handler({
      body: JSON.stringify({}),
      headers: {},
      pathParameters: {},
      queryStringParameters: {},
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      name: "sam",
    });
  });

  it("fails fast for unsupported schema keywords instead of silently accepting", async () => {
    const endpointModuleDirectory = await mkdtemp(join(tmpdir(), "babbstack-exec-endpoint-"));
    const endpointModulePath = join(endpointModuleDirectory, "endpoints.ts");
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    await writeFile(
      endpointModulePath,
      `
import { definePost, schema } from "${frameworkImportPath}";

definePost({
  path: "/unsupported",
  handler: async ({ body }) => ({
    value: {
      name: body.name,
    },
  }),
  request: {
    body: schema.object({
      name: schema.string(),
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
    const endpoints = listDefinedEndpoints();
    const endpoint = endpoints[0];
    if (!endpoint?.request.body) {
      throw new Error("Expected endpoint with request body schema");
    }
    endpoint.request.body.jsonSchema = {
      not: {
        type: "null",
      },
      properties: {
        name: {
          type: "string",
        },
      },
      required: ["name"],
      type: "object",
    } as unknown as typeof endpoint.request.body.jsonSchema;

    const outputDirectory = await mkdtemp(join(tmpdir(), "babbstack-lambda-js-"));
    await writeLambdaJsFiles(outputDirectory, endpoints, {
      endpointModulePath,
      frameworkImportPath,
    });
    const source = await readFile(join(outputDirectory, "post_unsupported.mjs"), "utf8");

    const handler = getHandlerFromSource(source);
    const response = await handler({
      body: JSON.stringify({
        name: "sam",
      }),
      headers: {},
      pathParameters: {},
      queryStringParameters: {},
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      error: "body: Unsupported schema keyword: not",
    });
  });
});
