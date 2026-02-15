/**
 * @fileoverview Implements render lambda js files.
 */
import { assertUniqueRouteIds } from "./assert-unique-route-ids";
import { renderLambdaEnvBootstrapSource } from "./render-lambda-env-bootstrap-source";
import { renderLambdaRuntimeSourceBlocks } from "./render-lambda-runtime-source-blocks";
import type { EndpointRuntimeDefinition, LambdaJsGenerationOptions } from "./types";

/** Runs render endpoint lookup. */
function renderEndpointLookup(routeId: string, method: string, variableName: string): string {
  return `const ${variableName} = listDefinedEndpoints().find((item) => {
      return item.routeId === "${routeId}" && item.method === "${method}";
    });
`;
}

/** Runs render file. */
function renderFile(
  endpoint: EndpointRuntimeDefinition,
  options: LambdaJsGenerationOptions,
): string {
  const frameworkImportPath = options.frameworkImportPath ?? "@babbstack/http-api-contract";
  const hasContextDatabase = Boolean(endpoint.context?.database);
  const hasContextS3 = Boolean(endpoint.context?.s3);
  const hasContextSqs = Boolean(endpoint.context?.sqs);
  const runtimeImportLines = [
    'import { Logger as simpleApiPowertoolsLogger } from "@aws-lambda-powertools/logger";',
    hasContextDatabase
      ? 'import { createDynamoDatabase as createSimpleApiCreateDynamoDatabase, createRuntimeDynamoDb as createSimpleApiRuntimeDynamoDb } from "@babbstack/dynamodb";'
      : 'import { createRuntimeDynamoDb as createSimpleApiRuntimeDynamoDb } from "@babbstack/dynamodb";',
    ...(hasContextS3
      ? [
          'import { createBucket as createSimpleApiCreateBucket, createRuntimeS3 as createSimpleApiRuntimeS3 } from "@babbstack/s3";',
        ]
      : []),
    ...(hasContextSqs
      ? ['import { createRuntimeSqs as createSimpleApiRuntimeSqs } from "@babbstack/sqs";']
      : []),
  ].join("\n");
  const endpointDatabaseContextLine = hasContextDatabase
    ? `const endpointDatabaseContext = ${JSON.stringify(endpoint.context?.database ?? null)};\n`
    : "";
  const endpointSqsContextLine = hasContextSqs
    ? `const endpointSqsContext = ${JSON.stringify(endpoint.context?.sqs ?? null)};\n`
    : "";
  const endpointS3ContextLine = hasContextS3
    ? `const endpointS3Context = ${JSON.stringify(endpoint.context?.s3 ?? null)};\n`
    : "";
  const contextDatabaseSupport = hasContextDatabase
    ? renderLambdaRuntimeSourceBlocks.toDatabaseContextHelperSource()
    : "";
  const contextS3Support = hasContextS3
    ? renderLambdaRuntimeSourceBlocks.toS3ContextHelperSource()
    : "";
  const contextSqsSupport = hasContextSqs
    ? renderLambdaRuntimeSourceBlocks.toSqsContextHelperSource()
    : "";
  const endpointDatabaseBinding = hasContextDatabase
    ? "const endpointDatabase = toDatabaseForContext(db, endpointDatabaseContext);"
    : "";
  const endpointDatabaseValue = hasContextDatabase ? "endpointDatabase" : "undefined";
  const endpointS3StateLine = hasContextS3 ? "const s3 = createSimpleApiRuntimeS3();" : "";
  const endpointS3Binding = hasContextS3
    ? "const endpointS3 = toS3ForContext(s3, endpointS3Context);"
    : "";
  const endpointS3Value = hasContextS3 ? "endpointS3" : "undefined";
  const endpointSqsStateLine = hasContextSqs ? "const sqs = createSimpleApiRuntimeSqs();" : "";
  const endpointSqsBinding = hasContextSqs
    ? "const endpointSqs = toSqsForContext(sqs, endpointSqsContext);"
    : "";
  const endpointSqsValue = hasContextSqs ? "endpointSqs" : "undefined";
  const envBootstrapSource = renderLambdaEnvBootstrapSource(endpoint);

  return `${runtimeImportLines}
import { listDefinedEndpoints } from "${frameworkImportPath}";

let endpointPromise;
const db = createSimpleApiRuntimeDynamoDb();
const simpleApiLogger = new simpleApiPowertoolsLogger({
  serviceName: "simple-api-generated-lambda"
});
${endpointS3StateLine}
${endpointSqsStateLine}
const endpointDbAccess = ${JSON.stringify(endpoint.access?.db ?? "write")};
const endpointSuccessStatusCode = ${JSON.stringify(endpoint.successStatusCode)};
${endpointDatabaseContextLine}
${endpointS3ContextLine}
${endpointSqsContextLine}

/** Handles load endpoint. */
async function loadEndpoint() {
  if (!endpointPromise) {
    endpointPromise = (async () => {
      ${renderEndpointLookup(endpoint.routeId, endpoint.method, "existingEndpoint")}
      if (existingEndpoint) {
        return existingEndpoint;
      }

      await import("${options.endpointModulePath}");

      ${renderEndpointLookup(endpoint.routeId, endpoint.method, "loadedEndpoint")}
      if (!loadedEndpoint) {
        throw new Error("Endpoint not found for ${endpoint.method} ${endpoint.routeId}");
      }

      return loadedEndpoint;
    })();
  }

  return endpointPromise;
}
${renderLambdaRuntimeSourceBlocks.toResponseAndHandlerHelpersSource()}
${renderLambdaRuntimeSourceBlocks.toDbAccessSupportSource()}
${contextDatabaseSupport}
${contextS3Support}
${contextSqsSupport}
${envBootstrapSource}

export async function handler(event) {
  await ensureEndpointEnvLoaded();
  const bodyResult = parseJsonBody(event);
  if (!bodyResult.ok) {
    return bodyResult.error;
  }

  const params = event?.pathParameters ?? {};
  const query = event?.queryStringParameters ?? {};
  const headers = event?.headers ?? {};
  const endpointDb = toDbForAccess(db, endpointDbAccess);
  ${endpointDatabaseBinding}
  ${endpointS3Binding}
  ${endpointSqsBinding}

  try {
    const endpoint = await loadEndpoint();
    const output = await endpoint.handler({
      body: bodyResult.value,
      database: ${endpointDatabaseValue},
      db: endpointDb,
      headers,
      params,
      query,
      request: {
        rawEvent: event
      },
      s3: ${endpointS3Value},
      sqs: ${endpointSqsValue}
    });
    const handlerOutput = toHandlerOutput(output, endpointSuccessStatusCode);
    return toResponse(handlerOutput.statusCode, handlerOutput.value, handlerOutput.contentType, handlerOutput.headers);
  } catch (error) {
    simpleApiLogger.error("lambda.handler.failed", {
      errorMessage: error instanceof Error ? error.message : String(error),
      method: "${endpoint.method}",
      path: "${endpoint.path}",
      routeId: "${endpoint.routeId}"
    });
    return toResponse(500, { error: "Handler execution failed" });
  }
}
`;
}

/**
 * Runs render lambda js files.
 * @param endpoints - Endpoints parameter.
 * @param options - Options parameter.
 * @example
 * renderLambdaJsFiles(endpoints, options)
 * @returns Output value.
 * @throws Error when operation fails.
 */
export function renderLambdaJsFiles(
  endpoints: ReadonlyArray<EndpointRuntimeDefinition>,
  options: LambdaJsGenerationOptions,
): Record<string, string> {
  const endpointModulePath = options.endpointModulePath.trim();
  if (endpointModulePath.length === 0) {
    throw new Error("endpointModulePath is required");
  }

  const lambdaEndpoints = endpoints.filter(
    (endpoint) => endpoint.execution?.kind !== "step-function",
  );
  assertUniqueRouteIds(lambdaEndpoints);

  const files: Record<string, string> = {};

  for (const endpoint of lambdaEndpoints) {
    files[`${endpoint.routeId}.mjs`] = renderFile(endpoint, {
      ...options,
      endpointModulePath,
    });
  }

  return files;
}
