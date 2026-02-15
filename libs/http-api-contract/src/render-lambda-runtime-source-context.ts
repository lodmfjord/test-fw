/**
 * @fileoverview Implements lambda runtime source context assembly.
 */
import { renderLambdaEnvBootstrapSource } from "./render-lambda-env-bootstrap-source";
import { renderLambdaRuntimeSourceBlocks } from "./render-lambda-runtime-source-blocks";
import type { LambdaRuntimeSourceContext } from "./lambda-runtime-source-context-type";
import type { EndpointRuntimeDefinition } from "./types";

/** Converts to runtime db import. */
function toRuntimeDbImport(
  hasRuntimeDb: boolean,
  hasContextDatabase: boolean,
  runtimeDbImportSpecifier: string,
): string {
  if (!hasRuntimeDb) return "";
  return hasContextDatabase
    ? `import { createDynamoDatabase as createSimpleApiCreateDynamoDatabase, createRuntimeDynamoDb as createSimpleApiRuntimeDynamoDb } from ${JSON.stringify(runtimeDbImportSpecifier)};`
    : `import { createRuntimeDynamoDb as createSimpleApiRuntimeDynamoDb } from ${JSON.stringify(runtimeDbImportSpecifier)};`;
}

/** Converts to runtime s3 import. */
function toRuntimeS3Import(
  hasRuntimeS3: boolean,
  hasContextS3: boolean,
  runtimeS3ImportSpecifier: string,
): string {
  if (!hasRuntimeS3) return "";
  return hasContextS3
    ? `import { createBucket as createSimpleApiCreateBucket, createRuntimeS3 as createSimpleApiRuntimeS3 } from ${JSON.stringify(runtimeS3ImportSpecifier)};`
    : `import { createRuntimeS3 as createSimpleApiRuntimeS3 } from ${JSON.stringify(runtimeS3ImportSpecifier)};`;
}

/** Converts to endpoint context line. */
function toEndpointContextLine(
  hasContext: boolean,
  contextName: string,
  contextValue: unknown,
): string {
  if (!hasContext) return "";
  return `const ${contextName} = ${JSON.stringify(contextValue ?? null)};\n`;
}

/** Converts to prelude source. */
function toPreludeSource(importLines: string[], runtimeImports: string[]): string {
  const preludeLines = [
    'import { z as simpleApiZod } from "zod";',
    'import { Logger as simpleApiPowertoolsLogger } from "@aws-lambda-powertools/logger";',
    ...importLines,
    ...runtimeImports.filter((line) => line.length > 0),
  ];
  if (preludeLines.length === 0) return "";
  return `${preludeLines.join("\n")}\n\n`;
}

/** Converts to endpoint request schemas. */
function toEndpointRequestSchemas(endpoint: EndpointRuntimeDefinition): Record<string, unknown> {
  return {
    ...(endpoint.request.body ? { body: endpoint.request.body.jsonSchema } : { body: null }),
    ...(endpoint.request.headers
      ? { headers: endpoint.request.headers.jsonSchema }
      : { headers: null }),
    ...(endpoint.request.params
      ? { params: endpoint.request.params.jsonSchema }
      : { params: null }),
    ...(endpoint.request.query ? { query: endpoint.request.query.jsonSchema } : { query: null }),
  };
}

/** Converts to endpoint response schemas by status code. */
function toEndpointResponseByStatusCodeSchemas(
  endpoint: EndpointRuntimeDefinition,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(endpoint.responseByStatusCode).map(([statusCode, schema]) => [
      statusCode,
      schema.jsonSchema,
    ]),
  );
}

/**
 * Converts to lambda runtime source context.
 * @param endpoint - Endpoint parameter.
 * @param handlerSource - Handler source parameter.
 * @param importLines - Import lines parameter.
 * @param runtimeDbImportSpecifier - Runtime db import specifier parameter.
 * @param runtimeS3ImportSpecifier - Runtime s3 import specifier parameter.
 * @param runtimeSqsImportSpecifier - Runtime sqs import specifier parameter.
 * @example
 * toLambdaRuntimeSourceContext(endpoint, handlerSource, importLines, runtimeDbImportSpecifier, runtimeS3ImportSpecifier, runtimeSqsImportSpecifier)
 * @returns Output value.
 */
export function toLambdaRuntimeSourceContext(
  endpoint: EndpointRuntimeDefinition,
  handlerSource: string,
  importLines: string[],
  runtimeDbImportSpecifier: string,
  runtimeS3ImportSpecifier: string,
  runtimeSqsImportSpecifier: string,
): LambdaRuntimeSourceContext {
  const usesHandlerDbContext = /\bdb\b/.test(handlerSource) || /\bdatabase\b/.test(handlerSource);
  const hasContextDatabase = Boolean(endpoint.context?.database);
  const hasRuntimeDb = hasContextDatabase || usesHandlerDbContext;
  const usesHandlerS3Context = /\bs3\b/.test(handlerSource);
  const hasContextS3 = Boolean(endpoint.context?.s3);
  const hasRuntimeS3 = hasContextS3 || usesHandlerS3Context;
  const usesHandlerSqsContext = /\bsqs\b/.test(handlerSource);
  const hasContextSqs = Boolean(endpoint.context?.sqs);
  const hasRuntimeSqs = hasContextSqs || usesHandlerSqsContext;
  const runtimeDbImport = toRuntimeDbImport(
    hasRuntimeDb,
    hasContextDatabase,
    runtimeDbImportSpecifier,
  );
  const runtimeS3Import = toRuntimeS3Import(hasRuntimeS3, hasContextS3, runtimeS3ImportSpecifier);
  const runtimeSqsImport = hasRuntimeSqs
    ? `import { createRuntimeSqs as createSimpleApiRuntimeSqs } from ${JSON.stringify(runtimeSqsImportSpecifier)};`
    : "";
  const runtimeDbState = hasRuntimeDb
    ? `const db = createSimpleApiRuntimeDynamoDb();\nconst endpointDbAccess = ${JSON.stringify(endpoint.access?.db ?? "write")};`
    : "";
  const runtimeS3State = hasRuntimeS3 ? "const s3 = createSimpleApiRuntimeS3();" : "";
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
  const endpointS3Binding = hasContextS3
    ? "const endpointS3 = toS3ForContext(s3, endpointS3Context);"
    : "";
  const endpointS3Value = hasContextS3 ? "endpointS3" : "undefined";
  const endpointSqsValue = hasContextSqs ? "endpointSqs" : "undefined";
  const envBootstrapSource = renderLambdaEnvBootstrapSource(endpoint);
  const prelude = toPreludeSource(importLines, [
    runtimeDbImport,
    runtimeS3Import,
    runtimeSqsImport,
  ]);
  const endpointDatabaseContextLine = toEndpointContextLine(
    hasContextDatabase,
    "endpointDatabaseContext",
    endpoint.context?.database,
  );
  const endpointS3ContextLine = toEndpointContextLine(
    hasContextS3,
    "endpointS3Context",
    endpoint.context?.s3,
  );
  const endpointSqsContextLine = toEndpointContextLine(
    hasContextSqs,
    "endpointSqsContext",
    endpoint.context?.sqs,
  );
  const contextDatabaseHelper = hasContextDatabase
    ? renderLambdaRuntimeSourceBlocks.toDatabaseContextHelperSource()
    : "";
  const contextSqsHelper = hasContextSqs
    ? renderLambdaRuntimeSourceBlocks.toSqsContextHelperSource()
    : "";
  const contextS3Helper = hasContextS3
    ? renderLambdaRuntimeSourceBlocks.toS3ContextHelperSource()
    : "";
  const endpointRequestSchemas = toEndpointRequestSchemas(endpoint);
  const endpointResponseByStatusCodeSchemas = toEndpointResponseByStatusCodeSchemas(endpoint);

  return {
    contextDatabaseHelper,
    contextS3Helper,
    contextSqsHelper,
    dbAccessSupport,
    endpointDatabaseBinding,
    endpointDatabaseContextLine,
    endpointDatabaseValue,
    endpointDbLine,
    endpointRequestSchemas,
    endpointResponseByStatusCodeSchemas,
    endpointResponseSchema: endpoint.response.jsonSchema,
    endpointS3Binding,
    endpointS3ContextLine,
    endpointS3Value,
    endpointSqsBinding,
    endpointSqsContextLine,
    endpointSqsValue,
    envBootstrapSource,
    prelude,
    runtimeDbState,
    runtimeS3State,
    runtimeSqsState,
  };
}
