import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { renderUsedImportLines } from "./render-used-import-lines";
import type { EndpointRuntimeDefinition } from "./types";

function resolveRuntimeDbImportSpecifier(endpointModulePath: string): string {
  const moduleSpecifier = "@babbstack/dynamodb";

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

function resolveRuntimeSqsImportSpecifier(endpointModulePath: string): string {
  const moduleSpecifier = "@babbstack/sqs";

  try {
    const requireFromEndpoint = createRequire(endpointModulePath);
    return requireFromEndpoint.resolve(moduleSpecifier);
  } catch {}

  try {
    const requireFromFramework = createRequire(import.meta.url);
    return requireFromFramework.resolve(moduleSpecifier);
  } catch {
    return fileURLToPath(new URL("../../sqs/src/index.ts", import.meta.url));
  }
}

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
  const endpointSqsBinding = hasContextSqs
    ? "const endpointSqs = toSqsForContext(sqs, endpointSqsContext);"
    : "";
  const endpointSqsValue = hasContextSqs ? "endpointSqs" : "undefined";
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
    ? `
function toDatabaseForContext(client, config) {
  if (!config) {
    return undefined;
  }

  const tableNamePrefix = typeof process === "undefined" || !process.env
    ? ""
    : process.env.SIMPLE_API_DYNAMODB_TABLE_NAME_PREFIX ?? "";
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
    tableName: tableNamePrefix + config.runtime.tableName
  });
  return database.bind(scopedDb);
}
`
    : "";
  const contextSqsHelper = hasContextSqs
    ? `
function toSqsForContext(client, config) {
  if (!config) {
    return undefined;
  }

  const queueNamePrefix = typeof process === "undefined" || !process.env
    ? ""
    : process.env.SIMPLE_API_SQS_QUEUE_NAME_PREFIX ?? "";
  const queueName = queueNamePrefix + config.runtime.queueName;
  return {
    async send(message) {
      await client.send({
        message,
        queueName
      });
      return message;
    }
  };
}
`
    : "";
  return `${prelude}${runtimeDbState}
${runtimeSqsState}
${endpointDatabaseContextLine}
${endpointSqsContextLine}
const endpointHandler = (${endpoint.handler.toString()});
function isBufferValue(payload) {
  return typeof Buffer !== "undefined" && Buffer.isBuffer(payload);
}

function toResponseBody(payload, contentType) {
  if (isBufferValue(payload)) {
    return {
      body: payload.toString("base64"),
      isBase64Encoded: true
    };
  }

  const normalized = String(contentType).toLowerCase();
  if (normalized.includes("/json") || normalized.includes("+json")) {
    return {
      body: JSON.stringify(payload),
      isBase64Encoded: false
    };
  }

  return {
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
    isBase64Encoded: false
  };
}

function toResponse(statusCode, payload, contentType, headers) {
  const resolvedContentType = contentType ?? (isBufferValue(payload) ? "application/octet-stream" : "application/json");
  const responseBody = toResponseBody(payload, resolvedContentType);
  return {
    statusCode,
    headers: {
      ...(headers ?? {}),
      "content-type": resolvedContentType
    },
    ...(responseBody.isBase64Encoded ? { isBase64Encoded: true } : {}),
    body: responseBody.body
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
    return { ok: false, error: toResponse(400, { error: "Invalid JSON body" }) };
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
  const contentType = output.contentType;
  if (contentType !== undefined && (typeof contentType !== "string" || contentType.trim().length === 0)) {
    throw new Error("Handler output contentType must be a non-empty string");
  }
  const outputHeaders = output.headers;
  if (outputHeaders !== undefined && (!outputHeaders || typeof outputHeaders !== "object" || Array.isArray(outputHeaders))) {
    throw new Error("Handler output headers must be an object with string values");
  }
  const headers = {};
  for (const [key, value] of Object.entries(outputHeaders ?? {})) {
    if (typeof value !== "string") {
      throw new Error("Handler output headers must be an object with string values");
    }
    headers[key] = value;
  }

  return {
    ...(contentType ? { contentType: contentType.trim() } : {}),
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
    statusCode,
    value: output.value
  };
}
${contextDatabaseHelper}
${contextSqsHelper}

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
    const handlerOutput = toHandlerOutput(output);
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
  const handlerSource = endpoint.handler.toString();
  const importLines = renderUsedImportLines(
    endpointModulePath,
    endpointModuleSource,
    handlerSource,
  );
  const runtimeDbImportSpecifier = resolveRuntimeDbImportSpecifier(endpointModulePath);
  const runtimeSqsImportSpecifier = resolveRuntimeSqsImportSpecifier(endpointModulePath);
  return renderLambdaRuntimeSource(
    endpoint,
    importLines,
    runtimeDbImportSpecifier,
    runtimeSqsImportSpecifier,
    handlerSource,
  );
}
