/**
 * @fileoverview Implements load endpoints from module.
 */
import { toImportPath } from "./to-import-path";
import type { EndpointRuntimeDefinition } from "./types";

/** Handles append endpoint. */
function appendEndpoint(
  result: EndpointRuntimeDefinition[],
  value: unknown,
  exportName: string,
): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      appendEndpoint(result, item, exportName);
    }

    return;
  }

  if (!value || typeof value !== "object") {
    throw new Error(
      `Endpoint export "${exportName}" must contain endpoints or nested endpoint arrays`,
    );
  }

  const candidate = value as Partial<EndpointRuntimeDefinition>;
  const isStepFunctionEndpoint = candidate.execution?.kind === "step-function";
  const hasValidHandler = isStepFunctionEndpoint || typeof candidate.handler === "function";
  const hasValidSuccessStatusCode =
    Number.isInteger(candidate.successStatusCode) &&
    (candidate.successStatusCode as number) >= 200 &&
    (candidate.successStatusCode as number) <= 299;
  const hasValidResponseByStatusCode =
    candidate.responseByStatusCode &&
    typeof candidate.responseByStatusCode === "object" &&
    !Array.isArray(candidate.responseByStatusCode);
  if (
    typeof candidate.routeId !== "string" ||
    typeof candidate.method !== "string" ||
    typeof candidate.path !== "string" ||
    !hasValidHandler ||
    !candidate.request ||
    !candidate.response ||
    !hasValidSuccessStatusCode ||
    !hasValidResponseByStatusCode
  ) {
    throw new Error(`Invalid endpoint found in export "${exportName}"`);
  }

  result.push(candidate as EndpointRuntimeDefinition);
}

/**
 * Handles load endpoints from module.
 * @param endpointModulePath - Endpoint module path parameter.
 * @param endpointExportName - Endpoint export name parameter.
 * @example
 * await loadEndpointsFromModule(endpointModulePath, endpointExportName)
 */
export async function loadEndpointsFromModule(
  endpointModulePath: string,
  endpointExportName: string,
): Promise<EndpointRuntimeDefinition[]> {
  const module = (await import(toImportPath(endpointModulePath))) as Record<string, unknown>;
  const exported = module[endpointExportName];

  if (exported === undefined) {
    throw new Error(`Endpoint export "${endpointExportName}" was not found`);
  }

  const endpoints: EndpointRuntimeDefinition[] = [];
  appendEndpoint(endpoints, exported, endpointExportName);
  return endpoints;
}
