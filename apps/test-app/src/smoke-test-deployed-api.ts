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
  log?: (message: string) => void;
  seedId?: string;
};

type EndpointExpectation = {
  body?: Record<string, unknown>;
  method: "GET" | "PATCH" | "POST";
  name: string;
  path: string;
  validate: (payload: unknown) => void;
};

function toBaseUrl(value: string): string {
  const source = value.trim();
  if (source.length === 0) {
    throw new Error("Base URL argument is required.");
  }

  return source.replace(/\/+$/g, "");
}

function assertObject(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(message);
  }

  return value as Record<string, unknown>;
}

function toEndpointExpectations(seedId: string): EndpointExpectation[] {
  return [
    {
      method: "GET",
      name: "health",
      path: "/health",
      validate(payload) {
        const parsed = assertObject(payload, "Expected /health response object");
        if (parsed.status !== "ok") {
          throw new Error(`Expected /health status "ok", received ${String(parsed.status)}`);
        }
      },
    },
    {
      method: "GET",
      name: "hello_world",
      path: "/hello_world",
      validate(payload) {
        const parsed = assertObject(payload, "Expected /hello_world response object");
        if (parsed.hello !== "hello-world-from-package") {
          throw new Error(
            `Expected /hello_world hello "hello-world-from-package", received ${String(parsed.hello)}`,
          );
        }
      },
    },
    {
      body: {
        name: "sam",
      },
      method: "POST",
      name: "users",
      path: "/users",
      validate(payload) {
        const parsed = assertObject(payload, "Expected /users response object");
        if (parsed.id !== "user-sam") {
          throw new Error(`Expected /users id "user-sam", received ${String(parsed.id)}`);
        }
      },
    },
    {
      method: "GET",
      name: "test-db-one-get",
      path: `/test-db-one/${seedId}`,
      validate(payload) {
        const parsed = assertObject(payload, "Expected /test-db-one GET response object");
        if (parsed.id !== seedId) {
          throw new Error(
            `Expected /test-db-one GET id "${seedId}", received ${String(parsed.id)}`,
          );
        }
        if (typeof parsed.name !== "string") {
          throw new Error(`Expected /test-db-one GET name string, received ${String(parsed.name)}`);
        }
      },
    },
    {
      body: {
        name: `test-db-one-${seedId}-updated`,
        points: 7,
      },
      method: "PATCH",
      name: "test-db-one-patch",
      path: `/test-db-one/${seedId}`,
      validate(payload) {
        const parsed = assertObject(payload, "Expected /test-db-one PATCH response object");
        if (parsed.id !== seedId) {
          throw new Error(
            `Expected /test-db-one PATCH id "${seedId}", received ${String(parsed.id)}`,
          );
        }
        if (parsed.points !== 7) {
          throw new Error(
            `Expected /test-db-one PATCH points 7, received ${String(parsed.points)}`,
          );
        }
      },
    },
    {
      method: "GET",
      name: "test-db-two-get",
      path: `/test-db-two/${seedId}`,
      validate(payload) {
        const parsed = assertObject(payload, "Expected /test-db-two GET response object");
        if (parsed.id !== seedId) {
          throw new Error(
            `Expected /test-db-two GET id "${seedId}", received ${String(parsed.id)}`,
          );
        }
        if (typeof parsed.title !== "string") {
          throw new Error(
            `Expected /test-db-two GET title string, received ${String(parsed.title)}`,
          );
        }
      },
    },
    {
      body: {
        enabled: true,
        title: `test-db-two-${seedId}-updated`,
      },
      method: "PATCH",
      name: "test-db-two-patch",
      path: `/test-db-two/${seedId}`,
      validate(payload) {
        const parsed = assertObject(payload, "Expected /test-db-two PATCH response object");
        if (parsed.id !== seedId) {
          throw new Error(
            `Expected /test-db-two PATCH id "${seedId}", received ${String(parsed.id)}`,
          );
        }
        if (parsed.enabled !== true) {
          throw new Error(
            `Expected /test-db-two PATCH enabled true, received ${String(parsed.enabled)}`,
          );
        }
      },
    },
  ];
}

async function executeEndpoint(
  endpoint: EndpointExpectation,
  baseUrl: string,
  fetchImpl: DeployedFetch,
): Promise<void> {
  const response = await fetchImpl(`${baseUrl}${endpoint.path}`, {
    ...(endpoint.body
      ? {
          body: JSON.stringify(endpoint.body),
          headers: {
            "content-type": "application/json",
          },
        }
      : {}),
    method: endpoint.method,
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  endpoint.validate(await response.json());
}

export async function runSmokeTestDeployedApi(
  baseUrl: string,
  options?: DeployedSmokeTestOptions,
): Promise<SmokeTestResult> {
  const normalizedBaseUrl = toBaseUrl(baseUrl);
  const fetchImpl = options?.fetchImpl ?? fetch;
  const log = options?.log ?? console.log;
  const seedId = options?.seedId ?? `smoke-${Date.now()}`;
  const endpoints = toEndpointExpectations(seedId);
  let passed = 0;

  for (const endpoint of endpoints) {
    try {
      await executeEndpoint(endpoint, normalizedBaseUrl, fetchImpl);
      passed += 1;
      log(`PASS ${endpoint.method} ${endpoint.path} (${endpoint.name})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      log(`FAIL ${endpoint.method} ${endpoint.path} (${endpoint.name}): ${message}`);
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
  const result = await runSmokeTestDeployedApi(baseUrl);
  console.log(`Smoke test complete: ${result.passed}/${result.total} passed`);
  if (result.failed > 0) {
    process.exit(1);
  }
}
