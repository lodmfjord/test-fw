/** @fileoverview Implements render lambda runtime entry. @module libs/http-api-contract/src/render-lambda-runtime-entry */
import { renderLambdaEnvBootstrapSource } from "./render-lambda-env-bootstrap-source";
import { renderLambdaRuntimeSourceBlocks } from "./render-lambda-runtime-source-blocks";
import { renderUsedImportLines } from "./render-used-import-lines";
import { resolveRuntimeModuleSpecifier } from "./resolve-runtime-module-specifier";
import type { EndpointRuntimeDefinition } from "./types";

/** Handles render lambda runtime source. */
function renderLambdaRuntimeSource(
  endpoint: EndpointRuntimeDefinition,
  importLines: string[],
  runtimeDbImportSpecifier: string,
  runtimeSqsImportSpecifier: string,
  handlerSource: string,
): string {
  const usesHandlerDbContext = /\bdb\b/.test(handlerSource) || /\bdatabase\b/.test(handlerSource);
  const hasContextDatabase = Boolean(endpoint.context?.database);
  const hasRuntimeDb = hasContextDatabase || usesHandlerDbContext;
  const usesHandlerSqsContext = /\bsqs\b/.test(handlerSource);
  const hasContextSqs = Boolean(endpoint.context?.sqs);
  const hasRuntimeSqs = hasContextSqs || usesHandlerSqsContext;
  const runtimeDbImport = hasRuntimeDb
    ? hasContextDatabase
      ? `import { createDynamoDatabase as createSimpleApiCreateDynamoDatabase, createRuntimeDynamoDb as createSimpleApiRuntimeDynamoDb } from ${JSON.stringify(runtimeDbImportSpecifier)};`
      : `import { createRuntimeDynamoDb as createSimpleApiRuntimeDynamoDb } from ${JSON.stringify(runtimeDbImportSpecifier)};`
    : "";
  const runtimeSqsImport = hasRuntimeSqs
    ? `import { createRuntimeSqs as createSimpleApiRuntimeSqs } from ${JSON.stringify(runtimeSqsImportSpecifier)};`
    : "";
  const runtimeDbState = hasRuntimeDb
    ? `const db = createSimpleApiRuntimeDynamoDb();
const endpointDbAccess = ${JSON.stringify(endpoint.access?.db ?? "write")};`
    : "";
  const runtimeSqsState = hasRuntimeSqs ? "const sqs = createSimpleApiRuntimeSqs();" : "";
  const dbAccessSupport = hasRuntimeDb
    ? renderLambdaRuntimeSourceBlocks.toDbAccessSupportSource()
    : "";
  const endpointDbLine = hasRuntimeDb
    ? "const endpointDb = toDbForAccess(db, endpointDbAccess);"
    : "const endpointDb = undefined;";
  const endpointDatabaseBinding = hasContextDatabase
    ? "const endpointDatabase = toDatabaseForContext(db, endpointDatabaseContext);"
    : "";
  const endpointDatabaseValue = hasContextDatabase ? "endpointDatabase" : "undefined";
  const endpointSqsBinding = hasContextSqs
    ? "const endpointSqs = toSqsForContext(sqs, endpointSqsContext);"
    : "";
  const endpointSqsValue = hasContextSqs ? "endpointSqs" : "undefined";
  const envBootstrapSource = renderLambdaEnvBootstrapSource(endpoint);
  const zodImportLine = 'import { z as simpleApiZod } from "zod";';
  const preludeLines = [
    zodImportLine,
    ...importLines,
    ...(runtimeDbImport.length > 0 ? [runtimeDbImport] : []),
    ...(runtimeSqsImport.length > 0 ? [runtimeSqsImport] : []),
  ];
  const prelude = preludeLines.length > 0 ? `${preludeLines.join("\n")}\n\n` : "";
  const endpointDatabaseContextLine = hasContextDatabase
    ? `const endpointDatabaseContext = ${JSON.stringify(endpoint.context?.database ?? null)};\n`
    : "";
  const endpointSqsContextLine = hasContextSqs
    ? `const endpointSqsContext = ${JSON.stringify(endpoint.context?.sqs ?? null)};\n`
    : "";
  const contextDatabaseHelper = hasContextDatabase
    ? renderLambdaRuntimeSourceBlocks.toDatabaseContextHelperSource()
    : "";
  const contextSqsHelper = hasContextSqs
    ? renderLambdaRuntimeSourceBlocks.toSqsContextHelperSource()
    : "";
  const requestSchemas = {
    ...(endpoint.request.body ? { body: endpoint.request.body.jsonSchema } : { body: null }),
    ...(endpoint.request.headers
      ? { headers: endpoint.request.headers.jsonSchema }
      : { headers: null }),
    ...(endpoint.request.params
      ? { params: endpoint.request.params.jsonSchema }
      : { params: null }),
    ...(endpoint.request.query ? { query: endpoint.request.query.jsonSchema } : { query: null }),
  };
  const responseByStatusCodeSchemas = Object.fromEntries(
    Object.entries(endpoint.responseByStatusCode).map(([statusCode, schema]) => [
      statusCode,
      schema.jsonSchema,
    ]),
  );
  const responseSchema = endpoint.response.jsonSchema;
  return `${prelude}${runtimeDbState}
${runtimeSqsState}
const endpointSuccessStatusCode = ${JSON.stringify(endpoint.successStatusCode)};
const endpointRouteId = ${JSON.stringify(endpoint.routeId)};
const endpointMethod = ${JSON.stringify(endpoint.method)};
const endpointPath = ${JSON.stringify(endpoint.path)};
${endpointDatabaseContextLine}
${endpointSqsContextLine}
const endpointRequestSchemas = ${JSON.stringify(requestSchemas)};
const endpointResponseByStatusCodeSchemas = ${JSON.stringify(responseByStatusCodeSchemas)};
const endpointResponseSchema = ${JSON.stringify(responseSchema)};
const endpointHandler = (${handlerSource});
${renderLambdaRuntimeSourceBlocks.toResponseAndHandlerHelpersSource()}
${renderLambdaRuntimeSourceBlocks.toObservabilitySupportSource()}
${renderLambdaRuntimeSourceBlocks.toZodValidationSupportSource()}
${dbAccessSupport}
${contextDatabaseHelper}
${contextSqsHelper}
${envBootstrapSource}

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

  ${endpointDbLine}
  ${endpointDatabaseBinding}
  ${endpointSqsBinding}

  let output;
  try {
    output = await endpointHandler({
      body: validatedBody,
      database: ${endpointDatabaseValue},
      db: endpointDb,
      headers: validatedHeaders,
      params: validatedParams,
      query: validatedQuery,
      request: {
        rawEvent: event
      },
      sqs: ${endpointSqsValue}
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

/** Handles render lambda runtime entry source. @example `renderLambdaRuntimeEntrySource(input)` */
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
  const runtimeSqsImportSpecifier = resolveRuntimeModuleSpecifier(
    endpointModulePath,
    "@babbstack/sqs",
    "../../sqs/src/index.ts",
  );
  return renderLambdaRuntimeSource(
    endpoint,
    importLines,
    runtimeDbImportSpecifier,
    runtimeSqsImportSpecifier,
    handlerSource,
  );
}
