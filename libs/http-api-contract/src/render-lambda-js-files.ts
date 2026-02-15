/**
 * @fileoverview Implements render lambda js files.
 */
import { assertUniqueRouteIds } from "./assert-unique-route-ids";
import { renderLambdaEnvBootstrapSource } from "./render-lambda-env-bootstrap-source";
import { renderLambdaRuntimeSourceBlocks } from "./render-lambda-runtime-source-blocks";
import type { EndpointRuntimeDefinition, LambdaJsGenerationOptions } from "./types";

/** Handles render endpoint lookup. */
function renderEndpointLookup(routeId: string, method: string, variableName: string): string {
  return `const ${variableName} = listDefinedEndpoints().find((item) => {
      return item.routeId === "${routeId}" && item.method === "${method}";
    });
`;
}

/** Handles render file. */
function renderFile(
  endpoint: EndpointRuntimeDefinition,
  options: LambdaJsGenerationOptions,
): string {
  const frameworkImportPath = options.frameworkImportPath ?? "@babbstack/http-api-contract";
  const hasContextDatabase = Boolean(endpoint.context?.database);
  const hasContextSqs = Boolean(endpoint.context?.sqs);
  const runtimeImportLines = [
    hasContextDatabase
      ? 'import { createDynamoDatabase as createSimpleApiCreateDynamoDatabase, createRuntimeDynamoDb as createSimpleApiRuntimeDynamoDb } from "@babbstack/dynamodb";'
      : 'import { createRuntimeDynamoDb as createSimpleApiRuntimeDynamoDb } from "@babbstack/dynamodb";',
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
  const contextDatabaseSupport = hasContextDatabase
    ? renderLambdaRuntimeSourceBlocks.toDatabaseContextHelperSource()
    : "";
  const contextSqsSupport = hasContextSqs
    ? renderLambdaRuntimeSourceBlocks.toSqsContextHelperSource()
    : "";
  const endpointDatabaseBinding = hasContextDatabase
    ? "const endpointDatabase = toDatabaseForContext(db, endpointDatabaseContext);"
    : "";
  const endpointDatabaseValue = hasContextDatabase ? "endpointDatabase" : "undefined";
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
${endpointSqsStateLine}
const endpointDbAccess = ${JSON.stringify(endpoint.access?.db ?? "write")};
const endpointSuccessStatusCode = ${JSON.stringify(endpoint.successStatusCode)};
${endpointDatabaseContextLine}
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
      sqs: ${endpointSqsValue}
    });
    const handlerOutput = toHandlerOutput(output, endpointSuccessStatusCode);
    return toResponse(handlerOutput.statusCode, handlerOutput.value, handlerOutput.contentType, handlerOutput.headers);
  } catch (error) {
    console.error("Handler execution failed for ${endpoint.method} ${endpoint.path}", error);
    return toResponse(500, { error: "Handler execution failed" });
  }
}
`;
}

/**
 * Handles render lambda js files.
 * @param endpoints - Endpoints parameter.
 * @param options - Options parameter.
 * @example
 * renderLambdaJsFiles(endpoints, options)
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
