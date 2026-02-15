/**
 * @fileoverview Implements render lambda runtime entry.
 */
import { renderLambdaRuntimeSourceBlocks } from "./render-lambda-runtime-source-blocks";
import { toLambdaRuntimeSourceContext } from "./render-lambda-runtime-source-context";
import { renderUsedImportLines } from "./render-used-import-lines";
import { resolveRuntimeModuleSpecifier } from "./resolve-runtime-module-specifier";
import type { EndpointRuntimeDefinition } from "./types";

/** Runs render lambda runtime source. */
function renderLambdaRuntimeSource(
  endpoint: EndpointRuntimeDefinition,
  importLines: string[],
  runtimeDbImportSpecifier: string,
  runtimeS3ImportSpecifier: string,
  runtimeSqsImportSpecifier: string,
  handlerSource: string,
): string {
  const context = toLambdaRuntimeSourceContext(
    endpoint,
    handlerSource,
    importLines,
    runtimeDbImportSpecifier,
    runtimeS3ImportSpecifier,
    runtimeSqsImportSpecifier,
  );

  return `${context.prelude}${context.runtimeDbState}
${context.runtimeS3State}
${context.runtimeSqsState}
const endpointSuccessStatusCode = ${JSON.stringify(endpoint.successStatusCode)};
const endpointRouteId = ${JSON.stringify(endpoint.routeId)};
const endpointMethod = ${JSON.stringify(endpoint.method)};
const endpointPath = ${JSON.stringify(endpoint.path)};
${context.endpointDatabaseContextLine}
${context.endpointS3ContextLine}
${context.endpointSqsContextLine}
const endpointRequestSchemas = ${JSON.stringify(context.endpointRequestSchemas)};
const endpointResponseByStatusCodeSchemas = ${JSON.stringify(context.endpointResponseByStatusCodeSchemas)};
const endpointResponseSchema = ${JSON.stringify(context.endpointResponseSchema)};
const endpointHandler = (${handlerSource});
${renderLambdaRuntimeSourceBlocks.toResponseAndHandlerHelpersSource()}
${renderLambdaRuntimeSourceBlocks.toObservabilitySupportSource()}
${renderLambdaRuntimeSourceBlocks.toZodValidationSupportSource()}
${context.dbAccessSupport}
${context.contextDatabaseHelper}
${context.contextS3Helper}
${context.contextSqsHelper}
${context.envBootstrapSource}

export async function handler(event) {
  const invocationLogContext = createInvocationLogContext(
    event,
    endpointRouteId,
    endpointMethod,
    endpointPath
  );
  logInvocationStart(invocationLogContext);
  await ensureEndpointEnvLoaded();
  const bodyResult = parseJsonBody(event);
  if (!bodyResult.ok) {
    const error = new Error("Invalid JSON body");
    logInputValidationFailure(invocationLogContext, error);
    logInvocationComplete(invocationLogContext, 400);
    return toResponse(400, { error: "Invalid JSON body" }, undefined, {
      "x-request-id": invocationLogContext.requestId
    });
  }

  const params = event?.pathParameters ?? {};
  const query = event?.queryStringParameters ?? {};
  const headers = event?.headers ?? {};
  let validatedParams = params;
  let validatedQuery = query;
  let validatedHeaders = headers;
  let validatedBody = bodyResult.value;

  try {
    validatedParams = parseBySchema(endpointRequestSchemas.params, params, "params");
    validatedQuery = parseBySchema(endpointRequestSchemas.query, query, "query");
    validatedHeaders = parseBySchema(endpointRequestSchemas.headers, headers, "headers");
    validatedBody = parseBySchema(endpointRequestSchemas.body, bodyResult.value, "body");
  } catch (error) {
    const message = error instanceof Error ? error.message : "input validation failed";
    logInputValidationFailure(invocationLogContext, error);
    logInvocationComplete(invocationLogContext, 400);
    return toResponse(400, { error: message }, undefined, {
      "x-request-id": invocationLogContext.requestId
    });
  }

  ${context.endpointDbLine}
  ${context.endpointDatabaseBinding}
  ${context.endpointS3Binding}
  ${context.endpointSqsBinding}

  let output;
  try {
    output = await endpointHandler({
      body: validatedBody,
      database: ${context.endpointDatabaseValue},
      db: endpointDb,
      headers: validatedHeaders,
      params: validatedParams,
      query: validatedQuery,
      request: {
        rawEvent: event
      },
      s3: ${context.endpointS3Value},
      sqs: ${context.endpointSqsValue}
    });
  } catch (error) {
    logHandlerFailure(invocationLogContext, error);
    logInvocationComplete(invocationLogContext, 500);
    return toResponse(500, { error: "Handler execution failed" }, undefined, {
      "x-request-id": invocationLogContext.requestId
    });
  }

  try {
    const handlerOutput = toHandlerOutput(output, endpointSuccessStatusCode);
    const responseHeaders = {
      ...(handlerOutput.headers ?? {}),
      "x-request-id": invocationLogContext.requestId
    };
    if (isBufferValue(handlerOutput.value)) {
      logInvocationComplete(invocationLogContext, handlerOutput.statusCode);
      return toResponse(
        handlerOutput.statusCode,
        handlerOutput.value,
        handlerOutput.contentType,
        responseHeaders
      );
    }

    const responseSchema =
      endpointResponseByStatusCodeSchemas[String(handlerOutput.statusCode)] ?? endpointResponseSchema;
    const validatedOutput = parseBySchema(responseSchema, handlerOutput.value, "response");
    logInvocationComplete(invocationLogContext, handlerOutput.statusCode);
    return toResponse(
      handlerOutput.statusCode,
      validatedOutput,
      handlerOutput.contentType,
      responseHeaders
    );
  } catch (error) {
    logOutputValidationFailure(invocationLogContext, error);
    logInvocationComplete(invocationLogContext, 500);
    return toResponse(500, { error: "Output validation failed" }, undefined, {
      "x-request-id": invocationLogContext.requestId
    });
  }
}
`;
}

/**
 * Runs render lambda runtime entry source.
 * @param endpointModulePath - Endpoint module path parameter.
 * @param endpointModuleSource - Endpoint module source parameter.
 * @param endpoint - Endpoint parameter.
 * @example
 * renderLambdaRuntimeEntrySource(endpointModulePath, endpointModuleSource, endpoint)
 * @returns Output value.
 * @throws Error when operation fails.
 */
export function renderLambdaRuntimeEntrySource(
  endpointModulePath: string,
  endpointModuleSource: string,
  endpoint: EndpointRuntimeDefinition,
): string {
  const handlerSource = endpoint.handler?.toString();
  if (!handlerSource) throw new Error(`Endpoint ${endpoint.routeId} is missing a lambda handler`);

  const importLines = renderUsedImportLines(
    endpointModulePath,
    endpointModuleSource,
    handlerSource,
  );
  const runtimeDbImportSpecifier = resolveRuntimeModuleSpecifier(
    endpointModulePath,
    "@babbstack/dynamodb",
    "../../dynamodb/src/index.ts",
  );
  const runtimeS3ImportSpecifier = resolveRuntimeModuleSpecifier(
    endpointModulePath,
    "@babbstack/s3",
    "../../s3/src/index.ts",
  );
  const runtimeSqsImportSpecifier = resolveRuntimeModuleSpecifier(
    endpointModulePath,
    "@babbstack/sqs",
    "../../sqs/src/index.ts",
  );

  return renderLambdaRuntimeSource(
    endpoint,
    importLines,
    runtimeDbImportSpecifier,
    runtimeS3ImportSpecifier,
    runtimeSqsImportSpecifier,
    handlerSource,
  );
}
