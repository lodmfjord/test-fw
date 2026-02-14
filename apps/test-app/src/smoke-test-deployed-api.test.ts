import { describe, expect, it } from "bun:test";
import { runSmokeTestDeployedApi } from "./smoke-test-deployed-api";

describe("runSmokeTestDeployedApi", () => {
  it("calls and validates deployed last-update endpoint", async () => {
    const calls: string[] = [];
    const baseUrl = "https://example.execute-api.eu-west-1.amazonaws.com/";

    const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      const key = `${request.method} ${url.pathname}`;
      calls.push(key);

      switch (key) {
        case "GET /last-update":
          return Response.json({
            time: new Date("2024-01-01T00:00:00.000Z").toISOString(),
          });
        default:
          return new Response("not found", { status: 404 });
      }
    };

    const result = await runSmokeTestDeployedApi(baseUrl, {
      fetchImpl,
      log: () => {},
    });

    expect(result).toEqual({
      failed: 0,
      passed: 1,
      total: 1,
    });
    expect(calls).toEqual(["GET /last-update"]);
  });
});
