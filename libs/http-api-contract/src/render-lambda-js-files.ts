import { assertUniqueRouteIds } from "./assert-unique-route-ids";
import type { EndpointRuntimeDefinition, LambdaJsGenerationOptions } from "./types";

function renderEndpointLookup(routeId: string, method: string, variableName: string): string {
  return `const ${variableName} = listDefinedEndpoints().find((item) => {
      return item.routeId === "${routeId}" && item.method === "${method}";
    });
`;
}

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
  const contextSqsSupport = hasContextSqs
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
  const endpointDatabaseBinding = hasContextDatabase
    ? "const endpointDatabase = toDatabaseForContext(db, endpointDatabaseContext);"
    : "";
  const endpointDatabaseValue = hasContextDatabase ? "endpointDatabase" : "undefined";
  const endpointSqsStateLine = hasContextSqs ? "const sqs = createSimpleApiRuntimeSqs();" : "";
  const endpointSqsBinding = hasContextSqs
    ? "const endpointSqs = toSqsForContext(sqs, endpointSqsContext);"
    : "";
  const endpointSqsValue = hasContextSqs ? "endpointSqs" : "undefined";

  return `${runtimeImportLines}
import { listDefinedEndpoints } from "${frameworkImportPath}";

let endpointPromise;
const db = createSimpleApiRuntimeDynamoDb();
${endpointSqsStateLine}
const endpointDbAccess = ${JSON.stringify(endpoint.access?.db ?? "write")};
${endpointDatabaseContextLine}
${endpointSqsContextLine}

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

function toDbForAccess(client, access) {
  if (access === "read") {
    return {
      read: client.read.bind(client)
    };
  }

  return client;
}

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
${contextDatabaseSupport}
${contextSqsSupport}

export async function handler(event) {
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
    const handlerOutput = toHandlerOutput(output);
    return toResponse(handlerOutput.statusCode, handlerOutput.value, handlerOutput.contentType, handlerOutput.headers);
  } catch (error) {
    console.error("Handler execution failed for ${endpoint.method} ${endpoint.path}", error);
    return toResponse(500, { error: "Handler execution failed" });
  }
}
`;
}

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
