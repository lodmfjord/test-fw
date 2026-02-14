import { mkdtemp, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "bun:test";
import { writeLambdaJsFiles } from "@babbstack/http-api-contract";
import { endpoints } from "./endpoints";

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
  const transformedSource = source
    .replace(/export\s+async\s+function\s+handler\s*\(/, "async function handler(")
    .replace(/export\s*\{\s*handler\s*\};?/g, "");
  const runtimeRequire = createRequire(import.meta.url);

  const factory = new Function(
    "require",
    "process",
    "Bun",
    `"use strict";
${transformedSource}
return handler;`,
  ) as (
    runtimeRequire: (moduleName: string) => unknown,
    runtimeProcess: NodeJS.Process,
    runtimeBun: unknown,
  ) => (event: LambdaLikeEvent) => Promise<LambdaLikeResponse>;

  return factory(runtimeRequire, process, undefined);
}

describe("generated lambda bundle", () => {
  it("executes generated last-update endpoint lambda in enclosed runtime", async () => {
    const endpointModulePath = fileURLToPath(new URL("./endpoints.ts", import.meta.url));
    const outputDirectory = await mkdtemp(join(tmpdir(), "test-app-lambda-bundle-"));
    const fileNames = await writeLambdaJsFiles(outputDirectory, endpoints.flat(), {
      endpointModulePath,
    });

    expect(fileNames).toEqual(["get_last_update.mjs"]);

    const source = await readFile(join(outputDirectory, "get_last_update.mjs"), "utf8");
    const handler = getHandlerFromSource(source);
    const response = await handler({
      body: "",
      headers: {},
      pathParameters: {},
      queryStringParameters: {},
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("application/json");
    const payload = JSON.parse(response.body) as { time?: string };
    expect(typeof payload.time).toBe("string");
    if (!payload.time) {
      throw new Error("expected time");
    }
    expect(new Date(payload.time).toISOString()).toBe(payload.time);
  });
});
