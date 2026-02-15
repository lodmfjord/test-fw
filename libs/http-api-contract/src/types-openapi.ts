/** @fileoverview Implements types openapi. @module libs/http-api-contract/src/types-openapi */
import type { JsonSchema } from "@babbstack/schema";
import type { EndpointAccess, EndpointDbAccess } from "./endpoint-context-types";
import type { RouteExecution } from "./route-execution-types";
import type { AwsRouteOptions, RouteAuth } from "./types-route";

export type OpenApiExtension = {
  access?: EndpointAccess<EndpointDbAccess>;
  auth: RouteAuth;
  aws?: AwsRouteOptions;
  execution: RouteExecution;
  handler: string;
  routeId: string;
};

export type OpenApiParameter = {
  in: "header" | "path" | "query";
  name: string;
  required: boolean;
  schema: JsonSchema;
};

export type OpenApiOperation = {
  "x-babbstack": OpenApiExtension;
  description?: string;
  operationId: string;
  parameters?: OpenApiParameter[];
  requestBody?: {
    content: {
      "application/json": {
        schema: JsonSchema;
      };
    };
    required: boolean;
  };
  responses: Record<
    string,
    {
      content?: {
        "application/json"?: {
          schema: JsonSchema;
        };
      };
      description: string;
    }
  >;
  summary?: string;
  tags?: string[];
};

export type OpenApiPathItem = {
  delete?: OpenApiOperation;
  get?: OpenApiOperation;
  head?: OpenApiOperation;
  options?: OpenApiOperation;
  patch?: OpenApiOperation;
  post?: OpenApiOperation;
  put?: OpenApiOperation;
};

export type OpenApiDocument = {
  info: {
    title: string;
    version: string;
  };
  openapi: "3.1.0";
  paths: Record<string, OpenApiPathItem>;
};
