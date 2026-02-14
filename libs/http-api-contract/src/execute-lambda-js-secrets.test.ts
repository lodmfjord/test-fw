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

describe("generated lambda execution env secrets", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("loads plain env values and logs secret loading outside lambda", async () => {
    const endpointModuleDirectory = await mkdtemp(join(tmpdir(), "babbstack-exec-endpoint-"));
    const endpointModulePath = join(endpointModuleDirectory, "endpoints.ts");
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    await writeFile(
      endpointModulePath,
      `
import { createEnv, createSecret, defineGet, schema } from "${frameworkImportPath}";

const sharedEnv = createEnv({
  APP_NAME: "dev-app",
  API_TOKEN: createSecret("/app/private/api-token"),
});

defineGet({
  env: [sharedEnv, { APP_NAME: "dev-app-v2" }],
  path: "/env",
  handler: () => ({
    value: {
      appName: process.env.APP_NAME ?? "",
      apiToken: process.env.API_TOKEN ?? "",
    },
  }),
  response: schema.object({
    apiToken: schema.string(),
    appName: schema.string(),
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
    const source = await readFile(join(outputDirectory, "get_env.mjs"), "utf8");

    const handler = getHandlerFromSource(source);
    const logged: string[] = [];
    const previousAppName = process.env.APP_NAME;
    const previousToken = process.env.API_TOKEN;
    const previousLambdaName = process.env.AWS_LAMBDA_FUNCTION_NAME;
    const originalConsoleLog = console.log;

    process.env.AWS_LAMBDA_FUNCTION_NAME = "";
    delete process.env.APP_NAME;
    delete process.env.API_TOKEN;
    console.log = (...parts: unknown[]) => {
      logged.push(parts.map((part) => String(part)).join(" "));
    };

    const response = await handler({
      body: "",
      headers: {},
      pathParameters: {},
      queryStringParameters: {},
    });

    console.log = originalConsoleLog;
    if (previousAppName === undefined) delete process.env.APP_NAME;
    else process.env.APP_NAME = previousAppName;
    if (previousToken === undefined) delete process.env.API_TOKEN;
    else process.env.API_TOKEN = previousToken;
    if (previousLambdaName === undefined) delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    else process.env.AWS_LAMBDA_FUNCTION_NAME = previousLambdaName;

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      apiToken: "",
      appName: "dev-app-v2",
    });
    expect(
      logged.some((entry) =>
        entry.includes("Would load parameter /app/private/api-token into API_TOKEN"),
      ),
    ).toBe(true);
  });

  it("uses local env fallback mapping for secrets outside lambda", async () => {
    const endpointModuleDirectory = await mkdtemp(join(tmpdir(), "babbstack-exec-endpoint-"));
    const endpointModulePath = join(endpointModuleDirectory, "endpoints.ts");
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    await writeFile(
      endpointModulePath,
      `
import { createEnv, createSecret, defineGet, schema } from "${frameworkImportPath}";

const sharedEnv = createEnv({
  API_TOKEN: createSecret("/app/private/api-token", {
    localEnvName: "SECRET_BLE",
  }),
});

defineGet({
  env: [sharedEnv],
  path: "/env",
  handler: () => ({
    value: {
      apiToken: process.env.API_TOKEN ?? "",
    },
  }),
  response: schema.object({
    apiToken: schema.string(),
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
    const source = await readFile(join(outputDirectory, "get_env.mjs"), "utf8");

    const handler = getHandlerFromSource(source);
    const previousToken = process.env.API_TOKEN;
    const previousSecretBle = process.env.SECRET_BLE;
    const previousLambdaName = process.env.AWS_LAMBDA_FUNCTION_NAME;
    process.env.AWS_LAMBDA_FUNCTION_NAME = "";
    delete process.env.API_TOKEN;
    process.env.SECRET_BLE = "mapped-local-value";

    const response = await handler({
      body: "",
      headers: {},
      pathParameters: {},
      queryStringParameters: {},
    });

    if (previousToken === undefined) delete process.env.API_TOKEN;
    else process.env.API_TOKEN = previousToken;
    if (previousSecretBle === undefined) delete process.env.SECRET_BLE;
    else process.env.SECRET_BLE = previousSecretBle;
    if (previousLambdaName === undefined) delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    else process.env.AWS_LAMBDA_FUNCTION_NAME = previousLambdaName;

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      apiToken: "mapped-local-value",
    });
  });
});
