import { renderLambdaEnvBootstrapSource } from "./render-lambda-env-bootstrap-source";
import { renderLambdaRuntimeSourceBlocks } from "./render-lambda-runtime-source-blocks";
import { renderUsedImportLines } from "./render-used-import-lines";
import { resolveRuntimeModuleSpecifier } from "./resolve-runtime-module-specifier";
import type { EndpointRuntimeDefinition } from "./types";

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
  const preludeLines = [
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

  return `${prelude}${runtimeDbState}
${runtimeSqsState}
const endpointSuccessStatusCode = ${JSON.stringify(endpoint.successStatusCode)};
${endpointDatabaseContextLine}
${endpointSqsContextLine}
const endpointHandler = (${handlerSource});
${renderLambdaRuntimeSourceBlocks.toResponseAndHandlerHelpersSource()}
${dbAccessSupport}
${contextDatabaseHelper}
${contextSqsHelper}
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
  ${endpointDbLine}
  ${endpointDatabaseBinding}
  ${endpointSqsBinding}

  try {
    const output = await endpointHandler({
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
