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
};

type EndpointExpectation = {
  method: "GET";
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

function toEndpointExpectations(): EndpointExpectation[] {
  return [
    {
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
  ];
}

async function executeEndpoint(
  endpoint: EndpointExpectation,
  baseUrl: string,
  fetchImpl: DeployedFetch,
): Promise<void> {
  const response = await fetchImpl(`${baseUrl}${endpoint.path}`, {
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
  const endpoints = toEndpointExpectations();
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
