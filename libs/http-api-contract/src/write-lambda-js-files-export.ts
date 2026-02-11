import type { EndpointRuntimeDefinition, LambdaJsGenerationOptions } from "./types";

export async function writeLambdaJsFiles(
  outputDirectory: string,
  endpoints: ReadonlyArray<EndpointRuntimeDefinition>,
  options: LambdaJsGenerationOptions,
): Promise<string[]> {
  const module = await import("./write-lambda-js-files");
  return module.writeLambdaJsFiles(outputDirectory, endpoints, options);
}
