/**
 * @fileoverview Implements build contract.
 */
import { buildContractHelpers } from "./build-contract-helpers";
import { toNormalizedGlobalCors } from "./to-normalized-global-cors";
import { toOpenApiDocumentFromRoutes } from "./to-openapi-document-from-routes";
import { toRoutesWithGlobalCorsOptions } from "./to-routes-with-global-cors-options";
import type { BuildContractInput, Contract } from "./types";

/**
 * Runs build contract.
 * @param input - Input parameter.
 * @example
 * buildContract(input)
 * @returns Output value.
 * @throws Error when operation fails.
 */
export function buildContract(input: BuildContractInput): Contract {
  const apiName = input.apiName.trim();
  if (apiName.length === 0) {
    throw new Error("apiName is required");
  }

  const version = input.version.trim();
  if (version.length === 0) {
    throw new Error("version is required");
  }

  const cors = toNormalizedGlobalCors(input.cors);
  const routes = toRoutesWithGlobalCorsOptions(input.routes, cors);
  buildContractHelpers.validateDuplicateRoutes(routes);

  const normalizedInput: BuildContractInput = {
    ...input,
    apiName,
    ...(cors ? { cors } : {}),
    routes,
    version,
  };

  return {
    deployContract: buildContractHelpers.toDeployContract(normalizedInput),
    envSchema: buildContractHelpers.toEnvSchema(normalizedInput),
    lambdasManifest: buildContractHelpers.toLambdasManifest(normalizedInput),
    openapi: toOpenApiDocumentFromRoutes(normalizedInput),
    routesManifest: buildContractHelpers.toRoutesManifest(normalizedInput),
  };
}
