import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { renderUsedImportLines } from "./render-used-import-lines";
import type { EndpointRuntimeDefinition } from "./types";

function resolveRuntimeDbImportSpecifier(endpointModulePath: string): string {
  const moduleSpecifier = "@simple-api/dynamodb";

  try {
    const requireFromEndpoint = createRequire(endpointModulePath);
    return requireFromEndpoint.resolve(moduleSpecifier);
  } catch {}

  try {
    const requireFromFramework = createRequire(import.meta.url);
    return requireFromFramework.resolve(moduleSpecifier);
  } catch {
    return fileURLToPath(new URL("../../dynamodb/src/index.ts", import.meta.url));
  }
}

function renderLambdaRuntimeSource(
  endpoint: EndpointRuntimeDefinition,
  importLines: string[],
  runtimeDbImportSpecifier: string,
  handlerSource: string,
): string {
  const usesHandlerDbContext = /\bdb\b/.test(handlerSource) || /\bdatabase\b/.test(handlerSource);
  const hasContextDatabase = Boolean(endpoint.context?.database);
  const hasRuntimeDb = hasContextDatabase || usesHandlerDbContext;
  const runtimeDbImport = hasRuntimeDb
    ? hasContextDatabase
      ? `import { createDynamoDatabase as createSimpleApiCreateDynamoDatabase, createRuntimeDynamoDb as createSimpleApiRuntimeDynamoDb } from ${JSON.stringify(runtimeDbImportSpecifier)};`
      : `import { createRuntimeDynamoDb as createSimpleApiRuntimeDynamoDb } from ${JSON.stringify(runtimeDbImportSpecifier)};`
    : "";
  const runtimeDbState = hasRuntimeDb
    ? `const db = createSimpleApiRuntimeDynamoDb();
const endpointDbAccess = ${JSON.stringify(endpoint.access?.db ?? "write")};`
    : "";
  const dbAccessSupport = hasRuntimeDb
    ? `
function toDbForAccess(client, access) {
  if (access === "read") {
    return {
      read: client.read.bind(client)
    };
  }

  return client;
}
`
    : "";
  const endpointDbLine = hasRuntimeDb
    ? "const endpointDb = toDbForAccess(db, endpointDbAccess);"
    : "const endpointDb = undefined;";
  const endpointDatabaseBinding = hasContextDatabase
    ? "const endpointDatabase = toDatabaseForContext(db, endpointDatabaseContext);"
    : "";
  const endpointDatabaseValue = hasContextDatabase ? "endpointDatabase" : "undefined";
  const preludeLines = runtimeDbImport.length > 0 ? [...importLines, runtimeDbImport] : importLines;
  const prelude = preludeLines.length > 0 ? `${preludeLines.join("\n")}\n\n` : "";
  const endpointDatabaseContextLine = hasContextDatabase
    ? `const endpointDatabaseContext = ${JSON.stringify(endpoint.context?.database ?? null)};\n`
    : "";
  const contextDatabaseHelper = hasContextDatabase
    ? `
function toDatabaseForContext(client, config) {
  if (!config) {
    return undefined;
  }

  const scopedDb = Array.isArray(config.access) && config.access.includes("write")
    ? client
    : {
      read: client.read.bind(client)
    };
  const parser = {
    parse(value) {
      return value;
    }
  };
  const database = createSimpleApiCreateDynamoDatabase(parser, config.runtime.keyField, {
    tableName: config.runtime.tableName
  });
  return database.bind(scopedDb);
}
`
    : "";
  return `${prelude}${runtimeDbState}
${endpointDatabaseContextLine}

const endpointHandler = (${endpoint.handler.toString()});

function toJsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  };
}

function parseJsonBody(event) {
  const rawBody = typeof event?.body === "string" ? event.body : "";
  if (rawBody.trim().length === 0) {
    return { ok: true, value: undefined };
  }

  try {
    return { ok: true, value: JSON.parse(rawBody) };
  } catch {
    return { ok: false, error: toJsonResponse(400, { error: "Invalid JSON body" }) };
  }
}
${dbAccessSupport}

function toHandlerOutput(output) {
  if (!output || typeof output !== "object" || !("value" in output)) {
    throw new Error("Handler output must include value");
  }

  const statusCode = output.statusCode === undefined ? 200 : output.statusCode;
  if (!Number.isInteger(statusCode) || statusCode < 100 || statusCode > 599) {
    throw new Error("Handler output statusCode must be an integer between 100 and 599");
  }

  return {
    statusCode,
    value: output.value
  };
}
${contextDatabaseHelper}

export async function handler(event) {
  const bodyResult = parseJsonBody(event);
  if (!bodyResult.ok) {
    return bodyResult.error;
  }

  const params = event?.pathParameters ?? {};
  const query = event?.queryStringParameters ?? {};
  const headers = event?.headers ?? {};
  ${endpointDbLine}
  ${endpointDatabaseBinding}

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
      }
    });
    const handlerOutput = toHandlerOutput(output);
    return toJsonResponse(handlerOutput.statusCode, handlerOutput.value);
  } catch {
    return toJsonResponse(500, { error: "Handler execution failed" });
  }
}
`;
}

export function renderLambdaRuntimeEntrySource(
  endpointModulePath: string,
  endpointModuleSource: string,
  endpoint: EndpointRuntimeDefinition,
): string {
  const handlerSource = endpoint.handler.toString();
  const importLines = renderUsedImportLines(
    endpointModulePath,
    endpointModuleSource,
    handlerSource,
  );
  const runtimeDbImportSpecifier = resolveRuntimeDbImportSpecifier(endpointModulePath);
  return renderLambdaRuntimeSource(endpoint, importLines, runtimeDbImportSpecifier, handlerSource);
}
