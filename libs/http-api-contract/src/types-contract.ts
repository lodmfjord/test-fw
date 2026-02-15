/**
 * @fileoverview Implements types contract.
 */
import type { GlobalCors } from "./cors-types";
import type { EnvSchema } from "./env-schema-types";
import type { EndpointContractDefinition } from "./types-endpoint";
import type { OpenApiDocument } from "./types-openapi";
import type { HttpMethod, RouteDefinition } from "./types-route";

export type EnvVarDefinition = {
  default?: string;
  description?: string;
  name: string;
  required?: boolean;
};

export type BuildContractInput = {
  apiName: string;
  cors?: GlobalCors;
  env?: EnvVarDefinition[];
  routes: RouteDefinition[];
  version: string;
};

export type BuildContractFromEndpointsInput = {
  apiName: string;
  cors?: GlobalCors;
  endpoints: ReadonlyArray<EndpointContractDefinition>;
  env?: EnvVarDefinition[];
  version: string;
};

export type LambdaJsGenerationOptions = {
  endpointModulePath: string;
  externalModules?: string[];
  frameworkImportPath?: string;
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
    cors?: GlobalCors;
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

export type Contract = {
  deployContract: DeployContract;
  envSchema: EnvSchema;
  lambdasManifest: LambdasManifest;
  openapi: OpenApiDocument;
  routesManifest: RoutesManifest;
};
