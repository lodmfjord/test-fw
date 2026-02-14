import { assertUniqueRouteIds } from "./assert-unique-route-ids";
import type {
  BuildContractInput,
  Contract,
  DeployContract,
  EnvSchema,
  LambdasManifest,
  OpenApiDocument,
  OpenApiOperation,
  OpenApiPathItem,
  RouteDefinition,
  RoutesManifest,
} from "./types";

function toOpenApiMethod(method: RouteDefinition["method"]): keyof OpenApiPathItem {
  return method.toLowerCase() as keyof OpenApiPathItem;
}

function validateDuplicateRoutes(routes: RouteDefinition[]): void {
  const seen = new Set<string>();

  for (const route of routes) {
    const key = `${route.method}:${route.path}`;
    if (seen.has(key)) {
      throw new Error(`Duplicate route: ${route.method} ${route.path}`);
    }

    seen.add(key);
  }

  assertUniqueRouteIds(routes);
}

function toOpenApiDocument(input: BuildContractInput): OpenApiDocument {
  const paths: Record<string, OpenApiPathItem> = {};

  for (const route of input.routes) {
    const operation: OpenApiOperation = {
      "x-babbstack": {
        auth: route.auth,
        ...(route.aws ? { aws: { ...route.aws } } : {}),
        handler: route.handler,
        routeId: route.routeId,
      },
      ...(route.description ? { description: route.description } : {}),
      operationId: route.operationId,
      responses: {
        "200": {
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

function toRoutesManifest(input: BuildContractInput): RoutesManifest {
  return {
    apiName: input.apiName,
    routes: input.routes.map((route) => ({ ...route })),
    schemaVersion: "1.0.0",
    version: input.version,
  };
}

function toLambdasManifest(input: BuildContractInput): LambdasManifest {
  return {
    apiName: input.apiName,
    functions: input.routes.map((route) => ({
      architecture: "arm64",
      artifactPath: `lambda-artifacts/${route.routeId}.zip`,
      functionId: route.routeId,
      handler: route.handler,
      memoryMb: route.aws?.memoryMb ?? 256,
      method: route.method,
      path: route.path,
      routeId: route.routeId,
      runtime: "nodejs20.x",
      timeoutSeconds: route.aws?.timeoutSeconds ?? 15,
    })),
    schemaVersion: "1.0.0",
    version: input.version,
  };
}

function toDeployContract(input: BuildContractInput): DeployContract {
  return {
    apiGateway: {
      stageName: "$default",
      type: "http-api-v2",
    },
    apiName: input.apiName,
    lambdaPackaging: {
      artifactsDirectory: "lambda-artifacts",
      strategy: "one-route-per-lambda",
    },
    manifests: {
      envSchema: "env.schema.json",
      lambdas: "lambdas.manifest.json",
      openapi: "openapi.json",
      routes: "routes.manifest.json",
    },
    schemaVersion: "1.0.0",
    version: input.version,
  };
}

function toEnvSchema(input: BuildContractInput): EnvSchema {
  const env = input.env ?? [];

  const properties: EnvSchema["properties"] = {};
  const required: string[] = [];

  for (const variable of env) {
    if (variable.name.trim().length === 0) {
      throw new Error("Environment variable name is required");
    }

    properties[variable.name] = {
      ...(variable.default ? { default: variable.default } : {}),
      ...(variable.description ? { description: variable.description } : {}),
      type: "string",
    };

    if (variable.required) {
      required.push(variable.name);
    }
  }

  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    additionalProperties: false,
    properties,
    required,
    type: "object",
  };
}

export function buildContract(input: BuildContractInput): Contract {
  const apiName = input.apiName.trim();
  if (apiName.length === 0) {
    throw new Error("apiName is required");
  }

  const version = input.version.trim();
  if (version.length === 0) {
    throw new Error("version is required");
  }

  validateDuplicateRoutes(input.routes);

  const normalizedInput: BuildContractInput = {
    ...input,
    apiName,
    version,
  };

  return {
    deployContract: toDeployContract(normalizedInput),
    envSchema: toEnvSchema(normalizedInput),
    lambdasManifest: toLambdasManifest(normalizedInput),
    openapi: toOpenApiDocument(normalizedInput),
    routesManifest: toRoutesManifest(normalizedInput),
  };
}
