import { describe, expect, it } from "bun:test";
import { runSmokeTestDeployedApi } from "./smoke-test-deployed-api";

describe("runSmokeTestDeployedApi", () => {
  it("calls and validates all deployed endpoints", async () => {
    const calls: string[] = [];
    const baseUrl = "https://example.execute-api.eu-west-1.amazonaws.com/";
    const seedId = "smoke-alpha";

    const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      const key = `${request.method} ${url.pathname}`;
      calls.push(key);

      switch (key) {
        case "GET /health":
          return Response.json({
            status: "ok",
          });
        case "GET /hello_world":
          return Response.json({
            hello: "hello-world-from-package",
          });
        case "POST /users": {
          const body = (await request.json()) as { name: string };
          return Response.json({
            id: `user-${body.name}`,
          });
        }
        case "GET /test-db-one/smoke-alpha":
          return Response.json({
            id: seedId,
            name: `test-db-one-${seedId}`,
            points: 0,
          });
        case "PATCH /test-db-one/smoke-alpha":
          return Response.json({
            id: seedId,
            name: `test-db-one-${seedId}-updated`,
            points: 7,
          });
        case "GET /test-db-two/smoke-alpha":
          return Response.json({
            enabled: false,
            id: seedId,
            title: `test-db-two-${seedId}`,
          });
        case "PATCH /test-db-two/smoke-alpha":
          return Response.json({
            enabled: true,
            id: seedId,
            title: `test-db-two-${seedId}-updated`,
          });
        default:
          return new Response("not found", { status: 404 });
      }
    };

    const result = await runSmokeTestDeployedApi(baseUrl, {
      fetchImpl,
      log: () => {},
      seedId,
    });

    expect(result).toEqual({
      failed: 0,
      passed: 7,
      total: 7,
    });
    expect(calls).toEqual([
      "GET /health",
      "GET /hello_world",
      "POST /users",
      "GET /test-db-one/smoke-alpha",
      "PATCH /test-db-one/smoke-alpha",
      "GET /test-db-two/smoke-alpha",
      "PATCH /test-db-two/smoke-alpha",
    ]);
  });
});
