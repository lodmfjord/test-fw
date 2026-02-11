import { defineRoute } from "./define-route";
import { registerDefinedEndpoint } from "./register-defined-endpoint";
import type {
  EndpointContextInput,
  EndpointDbAccess,
  EndpointDefinition,
  EndpointInput,
  EndpointRuntimeContext,
} from "./types";

function toHandlerId(routeId: string, providedHandlerId: string | undefined): string {
  const base = providedHandlerId ? providedHandlerId.trim() : `${routeId}_handler`;
  const normalized = base.replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_");

  if (normalized.length === 0) {
    throw new Error("handlerId is required");
  }

  return normalized;
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

  const baseRoute = defineRoute({
    ...(input.auth ? { auth: input.auth } : {}),
    ...(input.aws ? { aws: input.aws } : {}),
    ...(input.description ? { description: input.description } : {}),
    handler: "_placeholder_handler",
    method: input.method,
    ...(input.operationId ? { operationId: input.operationId } : {}),
    path: input.path,
    ...(input.summary ? { summary: input.summary } : {}),
    ...(input.tags ? { tags: input.tags } : {}),
  });

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
    handler: input.handler,
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
    routeId: baseRoute.routeId,
    ...(baseRoute.summary ? { summary: baseRoute.summary } : {}),
    tags: baseRoute.tags,
  };

  registerDefinedEndpoint(endpoint);
  return endpoint;
}
