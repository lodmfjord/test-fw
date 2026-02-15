/**
 * @fileoverview Runs deployed smoke tests against the full test-app endpoint surface.
 */
import { createLogger, createNoopLogger } from "@babbstack/logger";
import type { Logger } from "@babbstack/logger";
import { toSmokeTestDeployedEndpointExpectations } from "./to-smoke-test-deployed-endpoint-expectations";
import type {
  DeployedFetch,
  DeployedSmokeTestOptions,
  EndpointExpectation,
  SmokeTestResult,
} from "./smoke-test-deployed-api-types";

/** Converts to base url. */
function toBaseUrl(value: string): string {
  const source = value.trim();
  if (source.length === 0) {
    throw new Error("Base URL argument is required.");
  }

  return source.replace(/\/+$/g, "");
}

/** Runs execute endpoint. */
async function executeEndpoint(
  endpoint: EndpointExpectation,
  baseUrl: string,
  fetchImpl: DeployedFetch,
): Promise<void> {
  const requestInit: RequestInit = {
    method: endpoint.method,
  };
  if (endpoint.body !== undefined) {
    requestInit.body = JSON.stringify(endpoint.body);
    requestInit.headers = {
      "content-type": "application/json",
    };
  }

  const response = await fetchImpl(`${baseUrl}${endpoint.path}`, {
    ...requestInit,
  });
  if (response.status !== endpoint.expectedStatusCode) {
    throw new Error(
      `Expected HTTP ${endpoint.expectedStatusCode}, received HTTP ${response.status}`,
    );
  }

  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
  if (contentType.includes("/json") || contentType.includes("+json")) {
    endpoint.validate(await response.json(), response);
    return;
  }

  endpoint.validate(await response.text(), response);
}

/** Converts to logger. */
function toLogger(options: DeployedSmokeTestOptions | undefined): Logger {
  if (options?.logger) {
    return options.logger;
  }

  if (options?.log) {
    return {
      debug(message) {
        options.log?.(message);
      },
      error(message) {
        options.log?.(message);
      },
      getPersistentKeys() {
        return {};
      },
      info(message) {
        options.log?.(message);
      },
      warn(message) {
        options.log?.(message);
      },
    };
  }

  return createNoopLogger();
}

/**
 * Runs smoke test deployed api.
 * @param baseUrl - Base url parameter.
 * @param options - Options parameter.
 * @example
 * await runSmokeTestDeployedApi(baseUrl, options)
 * @returns Output value.
 */
export async function runSmokeTestDeployedApi(
  baseUrl: string,
  options?: DeployedSmokeTestOptions,
): Promise<SmokeTestResult> {
  const normalizedBaseUrl = toBaseUrl(baseUrl);
  const fetchImpl = options?.fetchImpl ?? fetch;
  const logger = toLogger(options);
  const endpoints = toSmokeTestDeployedEndpointExpectations();
  let passed = 0;

  for (const endpoint of endpoints) {
    try {
      await executeEndpoint(endpoint, normalizedBaseUrl, fetchImpl);
      passed += 1;
      logger.info(`PASS ${endpoint.method} ${endpoint.path} (${endpoint.name})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger.error(`FAIL ${endpoint.method} ${endpoint.path} (${endpoint.name}): ${message}`);
    }
  }

  return {
    failed: endpoints.length - passed,
    passed,
    total: endpoints.length,
  };
}

if (import.meta.main) {
  const baseUrl = process.argv[2] ?? "";
  const logger = createLogger({ serviceName: "test-app-smoke" });
  const result = await runSmokeTestDeployedApi(baseUrl, { logger });
  logger.info(`Smoke test complete: ${result.passed}/${result.total} passed`);
  if (result.failed > 0) {
    process.exit(1);
  }
}
