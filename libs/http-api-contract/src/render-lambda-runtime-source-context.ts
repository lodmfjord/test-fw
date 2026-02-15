/**
 * @fileoverview Implements lambda runtime source context assembly.
 */
import { renderLambdaEnvBootstrapSource } from "./render-lambda-env-bootstrap-source";
import { renderLambdaRuntimeSourceBlocks } from "./render-lambda-runtime-source-blocks";
import type { EndpointRuntimeDefinition } from "./types";

type LambdaRuntimeSourceContext = {
  contextDatabaseHelper: string;
  contextSqsHelper: string;
  dbAccessSupport: string;
  endpointDatabaseBinding: string;
  endpointDatabaseContextLine: string;
  endpointDatabaseValue: string;
  endpointDbLine: string;
  endpointRequestSchemas: Record<string, unknown>;
  endpointResponseByStatusCodeSchemas: Record<string, unknown>;
  endpointResponseSchema: unknown;
  endpointSqsBinding: string;
  endpointSqsContextLine: string;
  endpointSqsValue: string;
  envBootstrapSource: string;
  prelude: string;
  runtimeDbState: string;
  runtimeSqsState: string;
};

/**
 * Converts values to lambda runtime source context.
 * @param endpoint - Endpoint parameter.
 * @param handlerSource - Handler source parameter.
 * @param importLines - Import lines parameter.
 * @param runtimeDbImportSpecifier - Runtime db import specifier parameter.
 * @param runtimeSqsImportSpecifier - Runtime sqs import specifier parameter.
 * @example
 * toLambdaRuntimeSourceContext(endpoint, handlerSource, importLines, runtimeDbImportSpecifier, runtimeSqsImportSpecifier)
 */
export function toLambdaRuntimeSourceContext(
  endpoint: EndpointRuntimeDefinition,
  handlerSource: string,
  importLines: string[],
  runtimeDbImportSpecifier: string,
  runtimeSqsImportSpecifier: string,
): LambdaRuntimeSourceContext {
  const usesHandlerDbContext = /\bdb\b/.test(handlerSource) || /\bdatabase\b/.test(handlerSource);
  const hasContextDatabase = Boolean(endpoint.context?.database);
  const hasRuntimeDb = hasContextDatabase || usesHandlerDbContext;
  const usesHandlerSqsContext = /\bsqs\b/.test(handlerSource);
  const hasContextSqs = Boolean(endpoint.context?.sqs);
  const hasRuntimeSqs = hasContextSqs || usesHandlerSqsContext;
  let runtimeDbImport = "";
  if (hasRuntimeDb) {
    if (hasContextDatabase) {
      runtimeDbImport = `import { createDynamoDatabase as createSimpleApiCreateDynamoDatabase, createRuntimeDynamoDb as createSimpleApiRuntimeDynamoDb } from ${JSON.stringify(runtimeDbImportSpecifier)};`;
    } else {
      runtimeDbImport = `import { createRuntimeDynamoDb as createSimpleApiRuntimeDynamoDb } from ${JSON.stringify(runtimeDbImportSpecifier)};`;
    }
  }
  const runtimeSqsImport = hasRuntimeSqs
    ? `import { createRuntimeSqs as createSimpleApiRuntimeSqs } from ${JSON.stringify(runtimeSqsImportSpecifier)};`
    : "";
  const runtimeDbState = hasRuntimeDb
    ? `const db = createSimpleApiRuntimeDynamoDb();\nconst endpointDbAccess = ${JSON.stringify(endpoint.access?.db ?? "write")};`
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
  const endpointRequestSchemas = {
    ...(endpoint.request.body ? { body: endpoint.request.body.jsonSchema } : { body: null }),
    ...(endpoint.request.headers
      ? { headers: endpoint.request.headers.jsonSchema }
      : { headers: null }),
    ...(endpoint.request.params
      ? { params: endpoint.request.params.jsonSchema }
      : { params: null }),
    ...(endpoint.request.query ? { query: endpoint.request.query.jsonSchema } : { query: null }),
  };
  const endpointResponseByStatusCodeSchemas = Object.fromEntries(
    Object.entries(endpoint.responseByStatusCode).map(([statusCode, schema]) => [
      statusCode,
      schema.jsonSchema,
    ]),
  );

  return {
    contextDatabaseHelper,
    contextSqsHelper,
    dbAccessSupport,
    endpointDatabaseBinding,
    endpointDatabaseContextLine,
    endpointDatabaseValue,
    endpointDbLine,
    endpointRequestSchemas,
    endpointResponseByStatusCodeSchemas,
    endpointResponseSchema: endpoint.response.jsonSchema,
    endpointSqsBinding,
    endpointSqsContextLine,
    endpointSqsValue,
    envBootstrapSource,
    prelude,
    runtimeDbState,
    runtimeSqsState,
  };
}
