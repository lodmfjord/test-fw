import type { DynamoDbClient } from "@babbstack/dynamodb";
import type { SqsClient } from "@babbstack/sqs";
import type {
  EndpointAccess,
  EndpointContext,
  EndpointContextInput,
  EndpointDbAccess,
  EndpointRuntimeContext,
} from "./endpoint-context-types";
import type { JsonSchema, Schema } from "@babbstack/schema";
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";

export type RouteAuth = "none" | "jwt" | "iam";

export type AwsRouteOptions = {
  authorizerId?: string;
  memoryMb?: number;
  timeoutSeconds?: number;
};

export type RouteInput = {
  auth?: RouteAuth;
  aws?: AwsRouteOptions;
  description?: string;
  handler: string;
  method: string;
  operationId?: string;
  path: string;
  summary?: string;
  tags?: string[];
};

export type RouteDefinition = {
  auth: RouteAuth;
  aws?: AwsRouteOptions;
  description?: string;
  handler: string;
  method: HttpMethod;
  operationId: string;
  path: string;
  routeId: string;
  summary?: string;
  tags: string[];
};

export type EndpointRequest<TParams, TQuery, THeaders, TBody> = {
  body?: Schema<TBody>;
  headers?: Schema<THeaders>;
  params?: Schema<TParams>;
  query?: Schema<TQuery>;
};

export type CreateDevAppOptions = {
  db?: DynamoDbClient;
  sqs?: SqsClient;
};

export type EndpointHandler<
  TParams,
  TQuery,
  THeaders,
  TBody,
  TResponse,
  TDbAccess extends EndpointDbAccess = "write",
  TContextInput extends EndpointContextInput | undefined = undefined,
> = {
  bivarianceHack(
    context: EndpointContext<TParams, TQuery, THeaders, TBody, TDbAccess, TContextInput>,
  ): Promise<EndpointHandlerOutput<TResponse>> | EndpointHandlerOutput<TResponse>;
}["bivarianceHack"];

export type EndpointHandlerOutput<TResponse> = {
  contentType?: string;
  statusCode?: number;
  value: TResponse | Buffer;
};

export type EndpointInput<
  TParams,
  TQuery,
  THeaders,
  TBody,
  TResponse,
  TDbAccess extends EndpointDbAccess = "write",
  TContextInput extends EndpointContextInput | undefined = undefined,
> = {
  access?: EndpointAccess<TDbAccess>;
  auth?: RouteAuth;
  aws?: AwsRouteOptions;
  context?: TContextInput;
  description?: string;
  handler: EndpointHandler<TParams, TQuery, THeaders, TBody, TResponse, TDbAccess, TContextInput>;
  handlerId?: string;
  method: string;
  operationId?: string;
  path: string;
  request?: EndpointRequest<TParams, TQuery, THeaders, TBody>;
  response: Schema<TResponse>;
  summary?: string;
  tags?: string[];
};

export type EndpointMetadata = Omit<RouteDefinition, "handler"> & {
  access?: EndpointAccess<EndpointDbAccess>;
  context?: EndpointRuntimeContext;
  handlerId: string;
};

export type EndpointDefinition<
  TParams,
  TQuery,
  THeaders,
  TBody,
  TResponse,
  TDbAccess extends EndpointDbAccess = "write",
  TContextInput extends EndpointContextInput | undefined = undefined,
> = EndpointMetadata & {
  handler: EndpointHandler<TParams, TQuery, THeaders, TBody, TResponse, TDbAccess, TContextInput>;
  request: EndpointRequest<TParams, TQuery, THeaders, TBody>;
  response: Schema<TResponse>;
};

export type EndpointContractDefinition = EndpointMetadata & {
  request: EndpointRequest<unknown, unknown, unknown, unknown>;
  response: Schema<unknown>;
};

export type EndpointRuntimeHandler = {
  bivarianceHack(context: unknown): Promise<unknown> | unknown;
}["bivarianceHack"];

export type EndpointRuntimeDefinition = EndpointContractDefinition & {
  handler: EndpointRuntimeHandler;
};

export type EnvVarDefinition = {
  default?: string;
  description?: string;
  name: string;
  required?: boolean;
};

export type BuildContractInput = {
  apiName: string;
  env?: EnvVarDefinition[];
  routes: RouteDefinition[];
  version: string;
};

export type BuildContractFromEndpointsInput = {
  apiName: string;
  endpoints: ReadonlyArray<EndpointContractDefinition>;
  env?: EnvVarDefinition[];
  version: string;
};

export type LambdaJsGenerationOptions = {
  endpointModulePath: string;
  externalModules?: string[];
  frameworkImportPath?: string;
};

export type OpenApiExtension = {
  access?: EndpointAccess<EndpointDbAccess>;
  auth: RouteAuth;
  aws?: AwsRouteOptions;
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

export type RoutesManifest = {
  apiName: string;
  routes: RouteDefinition[];
  schemaVersion: "1.0.0";
  version: string;
};

export type LambdaDefinition = {
  architecture: "arm64";
  artifactPath: string;
  functionId: string;
  handler: string;
  memoryMb: number;
  method: HttpMethod;
  path: string;
  routeId: string;
  runtime: "nodejs20.x";
  timeoutSeconds: number;
};

export type LambdasManifest = {
  apiName: string;
  functions: LambdaDefinition[];
  schemaVersion: "1.0.0";
  version: string;
};

export type DeployContract = {
  apiGateway: {
    stageName: "$default";
    type: "http-api-v2";
  };
  apiName: string;
  lambdaPackaging: {
    artifactsDirectory: "lambda-artifacts";
    strategy: "one-route-per-lambda";
  };
  manifests: {
    envSchema: "env.schema.json";
    lambdas: "lambdas.manifest.json";
    openapi: "openapi.json";
    routes: "routes.manifest.json";
  };
  schemaVersion: "1.0.0";
  version: string;
};

export type JsonSchemaProperty = {
  default?: string;
  description?: string;
  type: "string";
};

export type EnvSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema";
  additionalProperties: false;
  properties: Record<string, JsonSchemaProperty>;
  required: string[];
  type: "object";
};

export type Contract = {
  deployContract: DeployContract;
  envSchema: EnvSchema;
  lambdasManifest: LambdasManifest;
  openapi: OpenApiDocument;
  routesManifest: RoutesManifest;
};

export type { EndpointAccess, EndpointContext, EndpointContextInput, EndpointDbAccess };
