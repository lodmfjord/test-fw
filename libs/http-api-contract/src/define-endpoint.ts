/**
 * @fileoverview Implements define endpoint.
 */
import { defineEndpointHelpers } from "./define-endpoint-helpers";
import { defineRoute } from "./define-route";
import { registerDefinedEndpoint } from "./register-defined-endpoint";
import type { Schema } from "@babbstack/schema";
import type {
  EndpointContextInput,
  EndpointDbAccess,
  EndpointDefinition,
  EndpointInput,
} from "./types";

/**
 * Defines endpoint.
 * @param input - Input parameter.
 * @example
 * defineEndpoint(input)
 * @returns Output value.
 * @throws Error when operation fails.
 */ export function defineEndpoint<
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
  const access = defineEndpointHelpers.toEndpointAccess(input.access);
  const context = defineEndpointHelpers.toEndpointContext(input.context);

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

  const handlerId = defineEndpointHelpers.toHandlerId(baseRoute.routeId, input.handlerId);
  const successStatusCode = defineEndpointHelpers.toSuccessStatusCode(
    input.successStatusCode,
    baseRoute.method,
    baseRoute.execution,
  );
  const responseByStatusCode = defineEndpointHelpers.toResponseByStatusCode(
    successStatusCode,
    input.response as Schema<unknown>,
    input.responses,
  );

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
    responseByStatusCode,
    response: input.response,
    successStatusCode,
    routeId: baseRoute.routeId,
    ...(baseRoute.summary ? { summary: baseRoute.summary } : {}),
    tags: baseRoute.tags,
  };

  registerDefinedEndpoint(endpoint);
  return endpoint;
}
