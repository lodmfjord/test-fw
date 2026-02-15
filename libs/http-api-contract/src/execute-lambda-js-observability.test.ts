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
  requestContext?: {
    requestId?: string;
  };
};

type LambdaLikeResponse = {
  body: string;
  headers: Record<string, string>;
  statusCode: number;
};

type LoggedEntry = {
  [key: string]: unknown;
};

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

function toEventLog(loggedEntries: LoggedEntry[], event: string): LoggedEntry | undefined {
  return loggedEntries.find((entry) => entry.event === event);
}

describe("generated lambda observability", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("emits structured invocation lifecycle logs and propagates correlation ids", async () => {
    const endpointModuleDirectory = await mkdtemp(join(tmpdir(), "babbstack-exec-endpoint-"));
    const endpointModulePath = join(endpointModuleDirectory, "endpoints.ts");
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    await writeFile(
      endpointModulePath,
      `
import { defineGet, schema } from "${frameworkImportPath}";

defineGet({
  path: "/health",
  handler: () => ({
    value: {
      ok: true,
    },
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
    const source = await readFile(join(outputDirectory, "get_health.mjs"), "utf8");

    const handler = getHandlerFromSource(source);
    const originalConsoleLog = console.log;
    const loggedEntries: LoggedEntry[] = [];
    console.log = (...args: unknown[]) => {
      if (args.length > 0 && args[0] && typeof args[0] === "object") {
        loggedEntries.push(args[0] as LoggedEntry);
      }
    };

    const response = await handler({
      body: "",
      headers: {
        "x-amzn-trace-id": "Root=1-test-trace",
        "x-request-id": "req-abc",
      },
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {
        requestId: "aws-req-123",
      },
    });
    console.log = originalConsoleLog;

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-request-id"]).toBe("req-abc");

    const startLog = toEventLog(loggedEntries, "lambda.invocation.start");
    const completeLog = toEventLog(loggedEntries, "lambda.invocation.complete");
    expect(startLog).toBeDefined();
    expect(completeLog).toBeDefined();
    expect(startLog).toMatchObject({
      method: "GET",
      path: "/health",
      requestId: "req-abc",
      routeId: "get_health",
      traceId: "Root=1-test-trace",
    });
    expect(completeLog).toMatchObject({
      method: "GET",
      path: "/health",
      requestId: "req-abc",
      routeId: "get_health",
      statusCode: 200,
      traceId: "Root=1-test-trace",
    });
    expect(typeof completeLog?.durationMs).toBe("number");
  });

  it("emits structured handler failure logs", async () => {
    const endpointModuleDirectory = await mkdtemp(join(tmpdir(), "babbstack-exec-endpoint-"));
    const endpointModulePath = join(endpointModuleDirectory, "endpoints.ts");
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    await writeFile(
      endpointModulePath,
      `
import { defineGet, schema } from "${frameworkImportPath}";

defineGet({
  path: "/boom",
  handler: () => {
    throw new Error("handler exploded");
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
    const source = await readFile(join(outputDirectory, "get_boom.mjs"), "utf8");

    const handler = getHandlerFromSource(source);
    const originalConsoleError = console.error;
    const loggedErrors: LoggedEntry[] = [];
    console.error = (...args: unknown[]) => {
      if (args.length > 0 && args[0] && typeof args[0] === "object") {
        loggedErrors.push(args[0] as LoggedEntry);
      }
    };

    const response = await handler({
      body: "",
      headers: {},
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {
        requestId: "aws-req-500",
      },
    });
    console.error = originalConsoleError;

    expect(response.statusCode).toBe(500);
    const failureLog = toEventLog(loggedErrors, "lambda.handler.failed");
    expect(failureLog).toBeDefined();
    expect(failureLog).toMatchObject({
      errorMessage: "handler exploded",
      errorName: "Error",
      method: "GET",
      path: "/boom",
      requestId: "aws-req-500",
      routeId: "get_boom",
    });
  });
});
