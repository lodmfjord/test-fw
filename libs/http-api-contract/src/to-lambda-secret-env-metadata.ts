/**
 * @fileoverview Collects lambda route secret-env metadata for Terraform SSM checks.
 */
import type { Contract } from "./types";
import { toSecretDefinition } from "./to-secret-definition";

type LambdaSecretEnvMetadata = {
  parameterKeysByRoute: Record<string, string[]>;
  parameterNameByKey: Record<string, string>;
};

/**
 * Converts to lambda secret env metadata.
 * @param contract - Contract parameter.
 * @example
 * toLambdaSecretEnvMetadata(contract)
 * @returns Output value.
 */
export function toLambdaSecretEnvMetadata(contract: Contract): LambdaSecretEnvMetadata {
  const lambdaRouteIds = new Set(
    (contract.lambdasManifest?.functions ?? []).map((item) => item.routeId),
  );
  const parameterNamesByRoute = new Map<string, Set<string>>();
  const uniqueParameterNames = new Set<string>();

  for (const route of contract.routesManifest?.routes ?? []) {
    if (!lambdaRouteIds.has(route.routeId) || !route.env) {
      continue;
    }

    for (const value of Object.values(route.env)) {
      const secretDefinition = toSecretDefinition(value);
      if (!secretDefinition) {
        continue;
      }

      const routeParameters = parameterNamesByRoute.get(route.routeId) ?? new Set<string>();
      routeParameters.add(secretDefinition.parameterName);
      parameterNamesByRoute.set(route.routeId, routeParameters);
      uniqueParameterNames.add(secretDefinition.parameterName);
    }
  }

  const sortedParameterNames = [...uniqueParameterNames].sort((left, right) =>
    left.localeCompare(right),
  );
  const parameterNameByKey = Object.fromEntries(
    sortedParameterNames.map((name, index) => [`parameter_${index}`, name]),
  );
  const parameterKeyByName = new Map<string, string>(
    Object.entries(parameterNameByKey).map(([key, name]) => [name, key]),
  );
  const parameterKeysByRoute = Object.fromEntries(
    [...parameterNamesByRoute.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([routeId, parameterNames]) => [
        routeId,
        [...parameterNames]
          .sort((left, right) => left.localeCompare(right))
          .map((name) => parameterKeyByName.get(name))
          .filter((value): value is string => typeof value === "string"),
      ]),
  );

  return {
    parameterKeysByRoute,
    parameterNameByKey,
  };
}
