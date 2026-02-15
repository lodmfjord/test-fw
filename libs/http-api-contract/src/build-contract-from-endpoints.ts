import { buildContract } from "./build-contract";
import type { Schema } from "@babbstack/schema";
import type {
  BuildContractFromEndpointsInput,
  Contract,
  OpenApiDocument,
  OpenApiOperation,
  OpenApiParameter,
  OpenApiPathItem,
} from "./types";

function toOpenApiMethod(method: string): keyof OpenApiPathItem {
  return method.toLowerCase() as keyof OpenApiPathItem;
}

function toParameters(
  location: OpenApiParameter["in"],
  validator: Schema<unknown> | undefined,
): OpenApiParameter[] {
  if (!validator) {
    return [];
  }

  if (validator.jsonSchema.type !== "object" || !validator.jsonSchema.properties) {
    return [];
  }

  const required = new Set(validator.jsonSchema.required ?? []);

  return Object.entries(validator.jsonSchema.properties).map(([name, itemSchema]) => ({
    in: location,
    name,
    required: location === "path" ? true : required.has(name),
    schema: itemSchema,
  }));
}

function toOpenApiResponses(
  responseByStatusCode: Record<string, Schema<unknown>>,
): OpenApiOperation["responses"] {
  const sortedEntries = Object.entries(responseByStatusCode).sort(
    ([left], [right]) => Number(left) - Number(right),
  );

  return Object.fromEntries(
    sortedEntries.map(([statusCode, schema]) => [
      statusCode,
      {
        content: {
          "application/json": {
            schema: schema.jsonSchema,
          },
        },
        description:
          Number(statusCode) >= 200 && Number(statusCode) <= 299 ? "Success" : "Response",
      },
    ]),
  );
}

function toOpenApiDocument(input: BuildContractFromEndpointsInput): OpenApiDocument {
  const paths: Record<string, OpenApiPathItem> = {};

  for (const endpoint of input.endpoints) {
    const parameters = [
      ...toParameters("path", endpoint.request.params),
      ...toParameters("query", endpoint.request.query),
      ...toParameters("header", endpoint.request.headers),
    ];

    const operation: OpenApiOperation = {
      "x-babbstack": {
        ...(endpoint.access ? { access: endpoint.access } : {}),
        auth: endpoint.auth,
        ...(endpoint.aws ? { aws: { ...endpoint.aws } } : {}),
        execution: endpoint.execution ?? { kind: "lambda" },
        handler: endpoint.handlerId,
        routeId: endpoint.routeId,
      },
      ...(endpoint.description ? { description: endpoint.description } : {}),
      operationId: endpoint.operationId,
      ...(parameters.length > 0 ? { parameters } : {}),
      ...(endpoint.request.body
        ? {
            requestBody: {
              content: {
                "application/json": {
                  schema: endpoint.request.body.jsonSchema,
                },
              },
              required: !endpoint.request.body.optional,
            },
          }
        : {}),
      responses: toOpenApiResponses(endpoint.responseByStatusCode),
      ...(endpoint.summary ? { summary: endpoint.summary } : {}),
      ...(endpoint.tags.length > 0 ? { tags: endpoint.tags } : {}),
    };

    const existingPathItem = paths[endpoint.path] ?? {};
    existingPathItem[toOpenApiMethod(endpoint.method)] = operation;
    paths[endpoint.path] = existingPathItem;
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

function withOptionsOperations(
  contractOpenApi: OpenApiDocument,
  openApiWithSchemas: OpenApiDocument,
): OpenApiDocument {
  const paths: OpenApiDocument["paths"] = {};

  const allPaths = new Set<string>([
    ...Object.keys(contractOpenApi.paths),
    ...Object.keys(openApiWithSchemas.paths),
  ]);
  for (const path of allPaths) {
    const contractPathItem = contractOpenApi.paths[path] ?? {};
    const schemaPathItem = openApiWithSchemas.paths[path] ?? {};

    paths[path] = {
      ...schemaPathItem,
      ...(schemaPathItem.options
        ? {}
        : contractPathItem.options
          ? { options: contractPathItem.options }
          : {}),
    };
  }

  return {
    ...openApiWithSchemas,
    paths,
  };
}

export function buildContractFromEndpoints(input: BuildContractFromEndpointsInput): Contract {
  const baseContract = buildContract({
    apiName: input.apiName,
    ...(input.cors ? { cors: { ...input.cors } } : {}),
    ...(input.env ? { env: input.env } : {}),
    routes: input.endpoints.map((endpoint) => ({
      auth: endpoint.auth,
      ...(endpoint.aws ? { aws: { ...endpoint.aws } } : {}),
      ...(endpoint.description ? { description: endpoint.description } : {}),
      ...(endpoint.env ? { env: { ...endpoint.env } } : {}),
      execution: endpoint.execution ?? { kind: "lambda" },
      handler: endpoint.handlerId,
      method: endpoint.method,
      operationId: endpoint.operationId,
      path: endpoint.path,
      routeId: endpoint.routeId,
      ...(endpoint.summary ? { summary: endpoint.summary } : {}),
      tags: [...endpoint.tags],
    })),
    version: input.version,
  });
  const openApiWithSchemas = toOpenApiDocument(input);

  return {
    ...baseContract,
    openapi: withOptionsOperations(baseContract.openapi, openApiWithSchemas),
  };
}
