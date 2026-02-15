/**
 * @fileoverview Implements render lambda runtime source blocks.
 */
import { toLambdaObservabilitySupportSource } from "./render-lambda-observability-source";
import { toS3ContextHelperSource } from "./render-lambda-s3-context-helper-source";
import { toZodValidationSupportSource } from "./render-lambda-zod-validation-source";

const RESPONSE_AND_HANDLER_HELPERS_SOURCE = `
/** Checks whether buffer value. */
function isBufferValue(payload) {
  return typeof Buffer !== "undefined" && Buffer.isBuffer(payload);
}

/** Converts values to response body. */
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

/** Converts values to response. */
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

/** Handles parse json body. */
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

/** Converts values to handler output. */
function toHandlerOutput(output, defaultStatusCode) {
  if (!output || typeof output !== "object" || !("value" in output)) {
    throw new Error("Handler output must include value");
  }

  const statusCode = output.statusCode === undefined ? defaultStatusCode : output.statusCode;
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
`;

const DB_ACCESS_SUPPORT_SOURCE = `
/** Converts values to db for access. */
function toDbForAccess(client, access) {
  if (access === "read") {
    return {
      read: client.read.bind(client)
    };
  }

  return client;
}
`;

const DATABASE_CONTEXT_HELPER_SOURCE = `
/** Converts values to database for context. */
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
`;

const SQS_CONTEXT_HELPER_SOURCE = `
/** Converts values to sqs for context. */
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
`;

const renderLambdaRuntimeSourceBlocks = {
  toDatabaseContextHelperSource(): string {
    return DATABASE_CONTEXT_HELPER_SOURCE;
  },
  toDbAccessSupportSource(): string {
    return DB_ACCESS_SUPPORT_SOURCE;
  },
  toObservabilitySupportSource(): string {
    return toLambdaObservabilitySupportSource();
  },
  toResponseAndHandlerHelpersSource(): string {
    return RESPONSE_AND_HANDLER_HELPERS_SOURCE;
  },
  toZodValidationSupportSource(): string {
    return toZodValidationSupportSource();
  },
  toSqsContextHelperSource(): string {
    return SQS_CONTEXT_HELPER_SOURCE;
  },
  toS3ContextHelperSource(): string {
    return toS3ContextHelperSource();
  },
};

export { renderLambdaRuntimeSourceBlocks };
