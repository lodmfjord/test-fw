/**
 * @fileoverview Implements smoke test deployed api.
 */
import { createLogger, createNoopLogger } from "@babbstack/logger";
import type { Logger } from "@babbstack/logger";

type SmokeTestResult = {
  failed: number;
  passed: number;
  total: number;
};

type DeployedFetch = (
  input: string | URL | Request,
  init?: RequestInit | undefined,
) => Promise<Response>;

type DeployedSmokeTestOptions = {
  fetchImpl?: DeployedFetch;
  logger?: Logger;
  log?: (message: string) => void;
};

type EndpointExpectation = {
  body?: unknown;
  method: "GET" | "POST";
  expectedStatusCode: number;
  name: string;
  path: string;
  validate: (payload: unknown) => void;
};

/** Converts to base url. */ function toBaseUrl(value: string): string {
  const source = value.trim();
  if (source.length === 0) {
    throw new Error("Base URL argument is required.");
  }

  return source.replace(/\/+$/g, "");
}

/** Runs assert object. */ function assertObject(
  value: unknown,
  message: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(message);
  }

  return value as Record<string, unknown>;
}

/** Converts to endpoint expectations. */ function toEndpointExpectations(): EndpointExpectation[] {
  return [
    {
      expectedStatusCode: 200,
      method: "GET",
      name: "last-update",
      path: "/last-update",
      validate(payload) {
        const parsed = assertObject(payload, "Expected /last-update response object");
        if (typeof parsed.time !== "string") {
          throw new Error(`Expected /last-update time string, received ${String(parsed.time)}`);
        }

        const normalized = new Date(parsed.time).toISOString();
        if (normalized !== parsed.time) {
          throw new Error(`Expected /last-update time ISO string, received ${String(parsed.time)}`);
        }
      },
    },
    {
      body: {
        value: "demo",
      },
      expectedStatusCode: 200,
      method: "POST",
      name: "step-function-demo-success",
      path: "/step-function-demo",
      validate(payload) {
        const parsed = assertObject(payload, "Expected /step-function-demo response object");
        if (parsed.ok !== true) {
          throw new Error(`Expected /step-function-demo ok true, received ${String(parsed.ok)}`);
        }

        if (parsed.source !== "step-function") {
          throw new Error(
            `Expected /step-function-demo source step-function, received ${String(parsed.source)}`,
          );
        }
      },
    },
    {
      body: {
        value: 1,
      },
      expectedStatusCode: 400,
      method: "POST",
      name: "step-function-demo-invalid-body",
      path: "/step-function-demo",
      validate(payload) {
        const parsed = assertObject(payload, "Expected /step-function-demo 400 response object");
        if (typeof parsed.error !== "string") {
          throw new Error(
            `Expected /step-function-demo 400 error string, received ${String(parsed.error)}`,
          );
        }
      },
    },
  ];
}

/** Runs execute endpoint. */ async function executeEndpoint(
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

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.toLowerCase().includes("/json") || contentType.toLowerCase().includes("+json")) {
    endpoint.validate(await response.json());
    return;
  }

  endpoint.validate(await response.text());
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
 */ export async function runSmokeTestDeployedApi(
  baseUrl: string,
  options?: DeployedSmokeTestOptions,
): Promise<SmokeTestResult> {
  const normalizedBaseUrl = toBaseUrl(baseUrl);
  const fetchImpl = options?.fetchImpl ?? fetch;
  const logger = toLogger(options);
  const endpoints = toEndpointExpectations();
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
