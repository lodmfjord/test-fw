/**
 * @fileoverview Implements define endpoint helpers.
 */
import type { Schema } from "@babbstack/schema";
import type { EndpointRuntimeContext } from "./endpoint-context-types";
import type { RouteExecution } from "./route-execution-types";
import type { EndpointAccess, EndpointContextInput, EndpointDbAccess } from "./types";

/** Converts to handler id. */
function toHandlerId(routeId: string, providedHandlerId: string | undefined): string {
  const base = providedHandlerId ? providedHandlerId.trim() : `${routeId}_handler`;
  const normalized = base.replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_");

  if (normalized.length === 0) {
    throw new Error("handlerId is required");
  }

  return normalized;
}

/** Converts to default success status code. */
function toDefaultSuccessStatusCode(method: string, execution: RouteExecution): number {
  if (method === "OPTIONS") {
    return 204;
  }

  if (execution.kind === "step-function" && execution.invocationType === "async") {
    return 202;
  }

  return 200;
}

/** Converts to success status code. */
function toSuccessStatusCode(
  value: number | undefined,
  method: string,
  execution: RouteExecution,
): number {
  const resolved = value ?? toDefaultSuccessStatusCode(method, execution);
  if (!Number.isInteger(resolved) || resolved < 200 || resolved > 299) {
    throw new Error("successStatusCode must be an integer between 200 and 299");
  }

  return resolved;
}

/** Converts to response by status code. */
function toResponseByStatusCode(
  successStatusCode: number,
  successResponse: Schema<unknown>,
  responses: Record<number, Schema<unknown>> | undefined,
): Record<string, Schema<unknown>> {
  const responseByStatusCode: Record<string, Schema<unknown>> = {
    [String(successStatusCode)]: successResponse,
  };
  if (!responses) {
    return responseByStatusCode;
  }

  for (const [statusCodeText, schema] of Object.entries(responses)) {
    const statusCode = Number(statusCodeText);
    if (!Number.isInteger(statusCode) || statusCode < 100 || statusCode > 599) {
      throw new Error("responses status code must be an integer between 100 and 599");
    }

    if (statusCode === successStatusCode) {
      throw new Error(`responses must not redefine successStatusCode ${successStatusCode}`);
    }

    responseByStatusCode[String(statusCode)] = schema;
  }

  return responseByStatusCode;
}

/** Converts to endpoint access. */
function toEndpointAccess(
  inputAccess: EndpointAccess<EndpointDbAccess> | undefined,
): { db: EndpointDbAccess } | undefined {
  if (!inputAccess) {
    return undefined;
  }

  if (inputAccess.db !== "read" && inputAccess.db !== "write") {
    throw new Error(`Unsupported db access: ${String(inputAccess.db)}`);
  }

  return {
    db: inputAccess.db,
  };
}

/** Converts to endpoint context. */
function toEndpointContext(
  inputContext: EndpointContextInput | undefined,
): EndpointRuntimeContext | undefined {
  let context: EndpointRuntimeContext | undefined;
  if (inputContext?.database) {
    const rawAccess = inputContext.database.access ?? ["write"];
    const normalizedAccess = [...new Set(rawAccess)];
    if (normalizedAccess.length === 0) {
      throw new Error("context.database.access must include at least one entry");
    }

    for (const value of normalizedAccess) {
      if (value !== "read" && value !== "write") {
        throw new Error(`Unsupported context.database access: ${String(value)}`);
      }
    }

    context = {
      database: {
        access: normalizedAccess,
        runtime: inputContext.database.handler.runtimeConfig,
      },
    };
  }

  if (inputContext?.sqs) {
    context = {
      ...(context ? { ...context } : {}),
      sqs: {
        runtime: inputContext.sqs.handler.runtimeConfig,
      },
    };
  }

  return context;
}

const defineEndpointHelpers = {
  toEndpointAccess,
  toEndpointContext,
  toHandlerId,
  toResponseByStatusCode,
  toSuccessStatusCode,
};

export { defineEndpointHelpers };
