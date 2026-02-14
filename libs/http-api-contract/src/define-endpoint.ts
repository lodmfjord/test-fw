import { defineRoute } from "./define-route";
import type { EndpointRuntimeContext } from "./endpoint-context-types";
import { registerDefinedEndpoint } from "./register-defined-endpoint";
import type {
  EndpointContextInput,
  EndpointDbAccess,
  EndpointDefinition,
  EndpointInput,
} from "./types";
import type { RouteExecution } from "./route-execution-types";

function toHandlerId(routeId: string, providedHandlerId: string | undefined): string {
  const base = providedHandlerId ? providedHandlerId.trim() : `${routeId}_handler`;
  const normalized = base.replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_");

  if (normalized.length === 0) {
    throw new Error("handlerId is required");
  }

  return normalized;
}

function toDefaultSuccessStatusCode(execution: RouteExecution): number {
  if (execution.kind === "step-function" && execution.invocationType === "async") {
    return 202;
  }

  return 200;
}

function toSuccessStatusCode(value: number | undefined, execution: RouteExecution): number {
  const resolved = value ?? toDefaultSuccessStatusCode(execution);
  if (!Number.isInteger(resolved) || resolved < 200 || resolved > 299) {
    throw new Error("successStatusCode must be an integer between 200 and 299");
  }

  return resolved;
}

export function defineEndpoint<
  TParams,
  TQuery,
  THeaders,
  TBody,
  TResponse,
  TDbAccess extends EndpointDbAccess = "write",
  TContextInput extends EndpointContextInput | undefined = undefined,
>(
  input: EndpointInput<TParams, TQuery, THeaders, TBody, TResponse, TDbAccess, TContextInput>,
): EndpointDefinition<TParams, TQuery, THeaders, TBody, TResponse, TDbAccess, TContextInput> {
  const hasHandler = typeof input.handler === "function";
  let access: { db: EndpointDbAccess } | undefined;
  if (input.access) {
    if (input.access.db !== "read" && input.access.db !== "write") {
      throw new Error(`Unsupported db access: ${String(input.access.db)}`);
    }

    access = {
      db: input.access.db,
    };
  }

  let context: EndpointRuntimeContext | undefined;
  if (input.context?.database) {
    const rawAccess = input.context.database.access ?? ["write"];
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
        runtime: input.context.database.handler.runtimeConfig,
      },
    };
  }

  if (input.context?.sqs) {
    context = {
      ...(context ? { ...context } : {}),
      sqs: {
        runtime: input.context.sqs.handler.runtimeConfig,
      },
    };
  }

  const baseRoute = defineRoute({
    ...(input.auth ? { auth: input.auth } : {}),
    ...(input.aws ? { aws: input.aws } : {}),
    ...(input.description ? { description: input.description } : {}),
    ...(input.env ? { env: input.env } : {}),
    ...(input.execution ? { execution: input.execution } : {}),
    handler: "_placeholder_handler",
    method: input.method,
    ...(input.operationId ? { operationId: input.operationId } : {}),
    path: input.path,
    ...(input.summary ? { summary: input.summary } : {}),
    ...(input.tags ? { tags: input.tags } : {}),
  });

  if (baseRoute.execution.kind === "step-function") {
    if (hasHandler) {
      throw new Error("Step-function routes must not define handlers");
    }

    if (access) {
      throw new Error("Step-function routes do not support endpoint db access overrides");
    }

    if (context) {
      throw new Error("Step-function routes do not support endpoint runtime context");
    }
  }

  if (baseRoute.execution.kind !== "step-function" && !hasHandler) {
    throw new Error("Lambda routes must define handlers");
  }

  const handlerId = toHandlerId(baseRoute.routeId, input.handlerId);

  const endpoint: EndpointDefinition<
    TParams,
    TQuery,
    THeaders,
    TBody,
    TResponse,
    TDbAccess,
    TContextInput
  > = {
    ...(access ? { access } : {}),
    auth: baseRoute.auth,
    ...(baseRoute.aws ? { aws: baseRoute.aws } : {}),
    ...(baseRoute.description ? { description: baseRoute.description } : {}),
    ...(baseRoute.env ? { env: baseRoute.env } : {}),
    execution: baseRoute.execution,
    ...(hasHandler ? { handler: input.handler } : {}),
    handlerId,
    method: baseRoute.method,
    operationId: baseRoute.operationId,
    path: baseRoute.path,
    ...(context ? { context } : {}),
    request: {
      ...(input.request?.body ? { body: input.request.body } : {}),
      ...(input.request?.headers ? { headers: input.request.headers } : {}),
      ...(input.request?.params ? { params: input.request.params } : {}),
      ...(input.request?.query ? { query: input.request.query } : {}),
    },
    response: input.response,
    successStatusCode: toSuccessStatusCode(input.successStatusCode, baseRoute.execution),
    routeId: baseRoute.routeId,
    ...(baseRoute.summary ? { summary: baseRoute.summary } : {}),
    tags: baseRoute.tags,
  };

  registerDefinedEndpoint(endpoint);
  return endpoint;
}
