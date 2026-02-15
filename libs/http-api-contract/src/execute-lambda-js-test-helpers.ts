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
 */
export function getHandlerFromSource(
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
