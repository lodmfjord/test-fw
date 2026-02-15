/**
 * @fileoverview Implements test helpers for generated lambda execution suites.
 */
import { createRequire } from "node:module";

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

/**
 * Gets handler from source.
 * @param source - Source parameter.
 * @example
 * getHandlerFromSource(source)
 * @returns Output value.
 * @throws Error when operation fails.
 */
export function getHandlerFromSource(
  source: string,
): (event: LambdaLikeEvent) => Promise<LambdaLikeResponse> {
  (globalThis as { __simpleApiPowertoolsLogs?: unknown[] }).__simpleApiPowertoolsLogs = [];
  const sourceWithoutZodImport = source.replace(
    /import\s+\{\s*z\s+as\s+simpleApiZod\s*\}\s+from\s+["']zod["'];?\s*/g,
    'const { z: simpleApiZod } = require("zod");\n',
  );
  const sourceWithoutLoggerImport = sourceWithoutZodImport.replace(
    /import\s+\{\s*Logger\s+as\s+simpleApiPowertoolsLogger\s*\}\s+from\s+["']@aws-lambda-powertools\/logger["'];?\s*/g,
    `const simpleApiPowertoolsLogSink = globalThis.__simpleApiPowertoolsLogs ?? (globalThis.__simpleApiPowertoolsLogs = []);
class simpleApiPowertoolsLogger {
  constructor() {}
  debug(message, payload) {
    simpleApiPowertoolsLogSink.push({ ...(payload ?? {}), level: "debug", message });
  }
  info(message, payload) {
    simpleApiPowertoolsLogSink.push({ ...(payload ?? {}), level: "info", message });
  }
  warn(message, payload) {
    simpleApiPowertoolsLogSink.push({ ...(payload ?? {}), level: "warn", message });
  }
  error(message, payload) {
    simpleApiPowertoolsLogSink.push({ ...(payload ?? {}), level: "error", message });
  }
}
`,
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
