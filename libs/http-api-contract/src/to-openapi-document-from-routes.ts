/**
 * @fileoverview Implements to openapi document from routes.
 */
import type {
  BuildContractInput,
  OpenApiDocument,
  OpenApiOperation,
  OpenApiPathItem,
  RouteDefinition,
} from "./types";

/** Converts values to open api method. */
function toOpenApiMethod(method: RouteDefinition["method"]): keyof OpenApiPathItem {
  return method.toLowerCase() as keyof OpenApiPathItem;
}

/** Converts values to open api success status code. */
function toOpenApiSuccessStatusCode(route: RouteDefinition): "200" | "204" {
  if (route.method === "OPTIONS") {
    return "204";
  }

  return "200";
}

/**
 * Converts values to open api document from routes.
 * @param input - Input parameter.
 * @example
 * toOpenApiDocumentFromRoutes(input)
 */
export function toOpenApiDocumentFromRoutes(input: BuildContractInput): OpenApiDocument {
  const paths: Record<string, OpenApiPathItem> = {};

  for (const route of input.routes) {
    const operation: OpenApiOperation = {
      "x-babbstack": {
        auth: route.auth,
        ...(route.aws ? { aws: { ...route.aws } } : {}),
        execution: route.execution ?? { kind: "lambda" },
        handler: route.handler,
        routeId: route.routeId,
      },
      ...(route.description ? { description: route.description } : {}),
      operationId: route.operationId,
      responses: {
        [toOpenApiSuccessStatusCode(route)]: {
          description: "Success",
        },
      },
      ...(route.summary ? { summary: route.summary } : {}),
      ...(route.tags.length > 0 ? { tags: route.tags } : {}),
    };

    const existingPathItem = paths[route.path] ?? {};
    existingPathItem[toOpenApiMethod(route.method)] = operation;
    paths[route.path] = existingPathItem;
  }

  return {
    info: {
      title: input.apiName,
      version: input.version,
    },
    openapi: "3.1.0",
    paths,
  };
}
