/** @fileoverview Implements write lambda js files export. @module libs/http-api-contract/src/write-lambda-js-files-export */
import type { EndpointRuntimeDefinition, LambdaJsGenerationOptions } from "./types";

/** Handles write lambda js files. @example `await writeLambdaJsFiles(input)` */
export async function writeLambdaJsFiles(
  outputDirectory: string,
  endpoints: ReadonlyArray<EndpointRuntimeDefinition>,
  options: LambdaJsGenerationOptions,
): Promise<string[]> {
  const module = await import("./write-lambda-js-files");
  return module.writeLambdaJsFiles(outputDirectory, endpoints, options);
}
