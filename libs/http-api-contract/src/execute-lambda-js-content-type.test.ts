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
  isBase64Encoded?: boolean;
  statusCode: number;
};

function getHandlerFromSource(
  source: string,
): (event: LambdaLikeEvent) => Promise<LambdaLikeResponse> {
  if (/^\s*import\s/m.test(source)) {
    throw new Error("Imports are forbidden in enclosed lambda runtime");
  }

  const transformedSource = source
    .replace(/export\s+async\s+function\s+handler\s*\(/, "async function handler(")
    .replace(/export\s*\{\s*handler\s*\};?/g, "");
  const runtimeRequire = createRequire(import.meta.url);

  const factory = new Function("require", `${transformedSource}\nreturn handler;`) as (
    runtimeRequire: (moduleName: string) => unknown,
  ) => (event: LambdaLikeEvent) => Promise<LambdaLikeResponse>;

  return factory(runtimeRequire);
}

describe("generated lambda execution contentType", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("uses custom contentType from handler output", async () => {
    const endpointModuleDirectory = await mkdtemp(join(tmpdir(), "babbstack-exec-endpoint-"));
    const endpointModulePath = join(endpointModuleDirectory, "endpoints.ts");
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    await writeFile(
      endpointModulePath,
      `
import { defineGet, schema } from "${frameworkImportPath}";

defineGet({
  path: "/text",
  handler: () => ({
    contentType: "text/plain",
    value: "ok",
  }),
  response: schema.string(),
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
    const source = await readFile(join(outputDirectory, "get_text.mjs"), "utf8");

    const handler = getHandlerFromSource(source);
    const response = await handler({
      body: "",
      headers: {},
      pathParameters: {},
      queryStringParameters: {},
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("text/plain");
    expect(response.body).toBe("ok");
  });

  it("base64 encodes buffer values for lambda responses", async () => {
    const endpointModuleDirectory = await mkdtemp(join(tmpdir(), "babbstack-exec-endpoint-"));
    const endpointModulePath = join(endpointModuleDirectory, "endpoints.ts");
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    await writeFile(
      endpointModulePath,
      `
import { defineGet, schema } from "${frameworkImportPath}";

defineGet({
  path: "/binary",
  handler: () => ({
    contentType: "application/octet-stream",
    value: Buffer.from([0, 1, 2, 3]),
  }),
  response: schema.string(),
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
    const source = await readFile(join(outputDirectory, "get_binary.mjs"), "utf8");

    const handler = getHandlerFromSource(source);
    const response = await handler({
      body: "",
      headers: {},
      pathParameters: {},
      queryStringParameters: {},
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("application/octet-stream");
    expect(response.isBase64Encoded).toBe(true);
    expect(response.body).toBe(Buffer.from([0, 1, 2, 3]).toString("base64"));
  });

  it("returns custom headers from handler output", async () => {
    const endpointModuleDirectory = await mkdtemp(join(tmpdir(), "babbstack-exec-endpoint-"));
    const endpointModulePath = join(endpointModuleDirectory, "endpoints.ts");
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    await writeFile(
      endpointModulePath,
      `
import { defineGet, schema } from "${frameworkImportPath}";

defineGet({
  path: "/headers",
  handler: () => ({
    headers: {
      "x-trace-id": "abc-123",
    },
    value: { ok: true },
  }),
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
    const source = await readFile(join(outputDirectory, "get_headers.mjs"), "utf8");

    const handler = getHandlerFromSource(source);
    const response = await handler({
      body: "",
      headers: {},
      pathParameters: {},
      queryStringParameters: {},
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-trace-id"]).toBe("abc-123");
    expect(response.headers["content-type"]).toBe("application/json");
    expect(JSON.parse(response.body)).toEqual({ ok: true });
  });
});
