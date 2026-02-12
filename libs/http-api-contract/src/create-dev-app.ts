import {
  createDynamoDatabase,
  createRuntimeDynamoDb,
  type DynamoDbClient,
} from "@babbstack/dynamodb";
import type { EndpointHandlerOutput } from "./types";
import type { EndpointRuntimeDefinition } from "./types";
import type { CreateDevAppOptions } from "./types";
import { toHttpResponseParts } from "./to-http-response-parts";

function toResponse(status: number, payload: unknown, contentType?: string): Response {
  const responseParts = toHttpResponseParts(payload, contentType);

  return new Response(responseParts.body, {
    headers: {
      "content-type": responseParts.contentType,
    },
    status,
  });
}

function matchPath(templatePath: string, requestPath: string): Record<string, string> | null {
  const templateSegments = templatePath.split("/").filter((segment) => segment.length > 0);
  const requestSegments = requestPath.split("/").filter((segment) => segment.length > 0);

  if (templateSegments.length !== requestSegments.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let index = 0; index < templateSegments.length; index += 1) {
    const templateSegment = templateSegments[index] ?? "";
    const requestSegment = requestSegments[index] ?? "";
    const paramMatch = templateSegment.match(/^\{(.+)\}$/);

    if (paramMatch?.[1]) {
      params[paramMatch[1]] = decodeURIComponent(requestSegment);
      continue;
    }

    if (templateSegment !== requestSegment) {
      return null;
    }
  }

  return params;
}

function toQuery(url: URL): Record<string, string> {
  const query: Record<string, string> = {};

  for (const [key, value] of url.searchParams.entries()) {
    query[key] = value;
  }

  return query;
}

function toHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of headers.entries()) {
    result[key.toLowerCase()] = value;
  }

  return result;
}

async function readJsonBody(request: Request): Promise<unknown> {
  const source = await request.text();

  if (source.trim().length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(source) as unknown;
  } catch {
    throw new Error("body: expected valid JSON");
  }
}

function toHandlerOutput(output: unknown): EndpointHandlerOutput<unknown> {
  if (!output || typeof output !== "object" || !("value" in output)) {
    throw new Error("Handler output must include value");
  }

  const typedOutput = output as {
    contentType?: unknown;
    statusCode?: unknown;
    value: unknown;
  };
  let statusCode = 200;
  if (typedOutput.statusCode !== undefined) {
    if (!Number.isInteger(typedOutput.statusCode)) {
      throw new Error("Handler output statusCode must be an integer");
    }

    statusCode = typedOutput.statusCode as number;
  }

  if (statusCode < 100 || statusCode > 599) {
    throw new Error("Handler output statusCode must be between 100 and 599");
  }

  let contentType: string | undefined;
  if (typedOutput.contentType !== undefined) {
    if (
      typeof typedOutput.contentType !== "string" ||
      typedOutput.contentType.trim().length === 0
    ) {
      throw new Error("Handler output contentType must be a non-empty string");
    }

    contentType = typedOutput.contentType.trim();
  }

  return {
    ...(contentType ? { contentType } : {}),
    statusCode,
    value: typedOutput.value,
  };
}

function findEndpoint(
  endpoints: ReadonlyArray<EndpointRuntimeDefinition>,
  method: string,
  path: string,
):
  | {
      endpoint: EndpointRuntimeDefinition;
      params: Record<string, string>;
    }
  | undefined {
  for (const endpoint of endpoints) {
    if (endpoint.method !== method) {
      continue;
    }

    const params = matchPath(endpoint.path, path);
    if (!params) {
      continue;
    }

    return { endpoint, params };
  }

  return undefined;
}

function toDbForEndpoint(
  db: DynamoDbClient,
  endpoint: EndpointRuntimeDefinition,
): DynamoDbClient | Pick<DynamoDbClient, "read"> {
  if (endpoint.access?.db === "read") {
    return {
      read: db.read.bind(db),
    };
  }

  return db;
}

function toDatabaseForEndpoint(
  db: DynamoDbClient,
  endpoint: EndpointRuntimeDefinition,
): unknown | undefined {
  const runtimeContext = endpoint.context?.database;
  if (!runtimeContext) {
    return undefined;
  }

  const scopedDb = runtimeContext.access.includes("write")
    ? db
    : {
        read: db.read.bind(db),
      };
  const parser = {
    parse(input: unknown): Record<string, unknown> {
      return input as Record<string, unknown>;
    },
  };
  const database = createDynamoDatabase(parser, runtimeContext.runtime.keyField, {
    tableName: runtimeContext.runtime.tableName,
  });

  return database.bind(scopedDb as Pick<DynamoDbClient, "read"> | DynamoDbClient);
}

export function createDevApp(
  endpoints: ReadonlyArray<EndpointRuntimeDefinition>,
  options: CreateDevAppOptions = {},
): (request: Request) => Promise<Response> {
  const db = options.db ?? createRuntimeDynamoDb();

  return async function fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    const matched = findEndpoint(endpoints, method, url.pathname);
    if (!matched) {
      return toResponse(404, { error: "Not found" });
    }

    const { endpoint, params } = matched;

    let parsedBody: unknown;
    if (endpoint.request.body) {
      try {
        parsedBody = await readJsonBody(request);
      } catch (error) {
        const message = error instanceof Error ? error.message : "body: expected valid JSON";
        return toResponse(400, { error: message });
      }
    }

    const rawHeaders = toHeaders(request.headers);
    const rawQuery = toQuery(url);

    let validatedParams: unknown = params;
    let validatedQuery: unknown = rawQuery;
    let validatedHeaders: unknown = rawHeaders;
    let validatedBody: unknown = parsedBody;

    try {
      validatedParams = endpoint.request.params
        ? endpoint.request.params.parse(params, "params")
        : validatedParams;
      validatedQuery = endpoint.request.query
        ? endpoint.request.query.parse(rawQuery, "query")
        : validatedQuery;
      validatedHeaders = endpoint.request.headers
        ? endpoint.request.headers.parse(rawHeaders, "headers")
        : validatedHeaders;
      validatedBody = endpoint.request.body
        ? endpoint.request.body.parse(parsedBody, "body")
        : validatedBody;
    } catch (error) {
      const message = error instanceof Error ? error.message : "input validation failed";
      return toResponse(400, { error: message });
    }

    let output: unknown;
    try {
      const endpointDb = toDbForEndpoint(db, endpoint);
      const endpointDatabase = toDatabaseForEndpoint(db, endpoint);
      const handler = endpoint.handler as (context: {
        body: unknown;
        database: unknown;
        db: unknown;
        headers: unknown;
        params: unknown;
        query: unknown;
        request: Request;
      }) => Promise<unknown> | unknown;

      output = await handler({
        body: validatedBody,
        database: endpointDatabase,
        db: endpointDb,
        headers: validatedHeaders,
        params: validatedParams,
        query: validatedQuery,
        request,
      });
    } catch {
      return toResponse(500, { error: "Handler execution failed" });
    }

    try {
      const handlerOutput = toHandlerOutput(output);
      if (typeof Buffer !== "undefined" && Buffer.isBuffer(handlerOutput.value)) {
        return toResponse(
          handlerOutput.statusCode ?? 200,
          handlerOutput.value,
          handlerOutput.contentType,
        );
      }

      const validatedOutput = endpoint.response.parse(handlerOutput.value, "response");
      return toResponse(
        handlerOutput.statusCode ?? 200,
        validatedOutput,
        handlerOutput.contentType,
      );
    } catch {
      return toResponse(500, { error: "Output validation failed" });
    }
  };
}
