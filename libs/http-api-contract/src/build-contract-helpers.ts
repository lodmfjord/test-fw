/** @fileoverview Implements build contract helpers. @module libs/http-api-contract/src/build-contract-helpers */
import { assertUniqueRouteIds } from "./assert-unique-route-ids";
import type { EnvSchema } from "./env-schema-types";
import type {
  BuildContractInput,
  DeployContract,
  LambdasManifest,
  RouteDefinition,
  RoutesManifest,
} from "./types";

/** Handles validate duplicate routes. */
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

/** Converts values to routes manifest. */
function toRoutesManifest(input: BuildContractInput): RoutesManifest {
  return {
    apiName: input.apiName,
    routes: input.routes.map((route) => ({ ...route })),
    schemaVersion: "1.0.0",
    version: input.version,
  };
}

/** Converts values to lambdas manifest. */
function toLambdasManifest(input: BuildContractInput): LambdasManifest {
  const lambdaRoutes = input.routes.filter((route) => route.execution?.kind !== "step-function");

  return {
    apiName: input.apiName,
    functions: lambdaRoutes.map((route) => ({
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

/** Converts values to deploy contract. */
function toDeployContract(input: BuildContractInput): DeployContract {
  return {
    apiGateway: {
      ...(input.cors ? { cors: { ...input.cors } } : {}),
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

/** Converts values to env schema. */
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

export const buildContractHelpers = {
  toDeployContract,
  toEnvSchema,
  toLambdasManifest,
  toRoutesManifest,
  validateDuplicateRoutes,
};
