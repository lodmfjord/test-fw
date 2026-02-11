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
  const frameworkImportPath = options.frameworkImportPath ?? "@simple-api/http-api-contract";
  const hasContextDatabase = Boolean(endpoint.context?.database);
  const runtimeDbImportLine = hasContextDatabase
    ? 'import { createDynamoDatabase as createSimpleApiCreateDynamoDatabase, createRuntimeDynamoDb as createSimpleApiRuntimeDynamoDb } from "@simple-api/dynamodb";'
    : 'import { createRuntimeDynamoDb as createSimpleApiRuntimeDynamoDb } from "@simple-api/dynamodb";';
  const endpointDatabaseContextLine = hasContextDatabase
    ? `const endpointDatabaseContext = ${JSON.stringify(endpoint.context?.database ?? null)};\n`
    : "";
  const contextDatabaseSupport = hasContextDatabase
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
  const endpointDatabaseBinding = hasContextDatabase
    ? "const endpointDatabase = toDatabaseForContext(db, endpointDatabaseContext);"
    : "";
  const endpointDatabaseValue = hasContextDatabase ? "endpointDatabase" : "undefined";

  return `${runtimeDbImportLine}
import { listDefinedEndpoints } from "${frameworkImportPath}";

let endpointPromise;
const db = createSimpleApiRuntimeDynamoDb();
const endpointDbAccess = ${JSON.stringify(endpoint.access?.db ?? "write")};
${endpointDatabaseContextLine}

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

  return {
    statusCode,
    value: output.value
  };
}
${contextDatabaseSupport}

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

export function renderLambdaJsFiles(
  endpoints: ReadonlyArray<EndpointRuntimeDefinition>,
  options: LambdaJsGenerationOptions,
): Record<string, string> {
  const endpointModulePath = options.endpointModulePath.trim();
  if (endpointModulePath.length === 0) {
    throw new Error("endpointModulePath is required");
  }

  const files: Record<string, string> = {};

  for (const endpoint of endpoints) {
    files[`${endpoint.routeId}.mjs`] = renderFile(endpoint, {
      ...options,
      endpointModulePath,
    });
  }

  return files;
}
