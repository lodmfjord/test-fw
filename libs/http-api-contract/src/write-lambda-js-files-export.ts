/**
 * @fileoverview Implements write lambda js files export.
 */
import type { EndpointRuntimeDefinition, LambdaJsGenerationOptions } from "./types";

/**
 * Runs write lambda js files.
 * @param outputDirectory - Output directory parameter.
 * @param endpoints - Endpoints parameter.
 * @param options - Options parameter.
 * @example
 * await writeLambdaJsFiles(outputDirectory, endpoints, options)
 * @returns Output value.
 */
export async function writeLambdaJsFiles(
  outputDirectory: string,
  endpoints: ReadonlyArray<EndpointRuntimeDefinition>,
  options: LambdaJsGenerationOptions,
): Promise<string[]> {
  const module = await import("./write-lambda-js-files");
  return module.writeLambdaJsFiles(outputDirectory, endpoints, options);
}
