/**
 * @fileoverview Tests smoke test deployed api.
 */
import { describe, expect, it } from "bun:test";
import type { Logger } from "@babbstack/logger";
import { runSmokeTestDeployedApi } from "./smoke-test-deployed-api";

describe("runSmokeTestDeployedApi", () => {
  it("checks status codes and multi-response behavior for deployed endpoints", async () => {
    const calls: string[] = [];
    const baseUrl = "https://example.execute-api.eu-west-1.amazonaws.com/";

    /** Runs fetch impl. */ const fetchImpl = async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      const bodyText = await request.text();
      const key = `${request.method} ${url.pathname} ${bodyText}`;
      calls.push(key);

      switch (key) {
        case "GET /last-update ":
          return Response.json({
            time: new Date("2024-01-01T00:00:00.000Z").toISOString(),
          });
        case 'POST /step-function-demo {"value":"demo"}':
          return Response.json({
            ok: true,
            source: "step-function",
          });
        case 'POST /step-function-demo {"value":1}':
          return new Response(
            JSON.stringify({
              error: "body.value: expected string",
            }),
            {
              headers: {
                "content-type": "application/json",
              },
              status: 400,
            },
          );
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
      passed: 3,
      total: 3,
    });
    expect(calls).toEqual([
      "GET /last-update ",
      'POST /step-function-demo {"value":"demo"}',
      'POST /step-function-demo {"value":1}',
    ]);
  });

  it("prefers options.logger over options.log", async () => {
    const baseUrl = "https://example.execute-api.eu-west-1.amazonaws.com/";
    const logMessages: string[] = [];
    const loggerMessages: string[] = [];
    const logger: Logger = {
      debug(message) {
        loggerMessages.push(message);
      },
      error(message) {
        loggerMessages.push(message);
      },
      getPersistentKeys() {
        return {};
      },
      info(message) {
        loggerMessages.push(message);
      },
      warn(message) {
        loggerMessages.push(message);
      },
    };

    /** Runs fetch impl. */ const fetchImpl = async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      const bodyText = await request.text();
      const key = `${request.method} ${url.pathname} ${bodyText}`;

      switch (key) {
        case "GET /last-update ":
          return Response.json({
            time: new Date("2024-01-01T00:00:00.000Z").toISOString(),
          });
        case 'POST /step-function-demo {"value":"demo"}':
          return Response.json({
            ok: true,
            source: "step-function",
          });
        case 'POST /step-function-demo {"value":1}':
          return new Response(
            JSON.stringify({
              error: "body.value: expected string",
            }),
            {
              headers: {
                "content-type": "application/json",
              },
              status: 400,
            },
          );
        default:
          return new Response("not found", { status: 404 });
      }
    };

    const result = await runSmokeTestDeployedApi(baseUrl, {
      fetchImpl,
      log(message) {
        logMessages.push(message);
      },
      logger,
    });

    expect(result.failed).toBe(0);
    expect(logMessages).toEqual([]);
    expect(loggerMessages.length > 0).toBe(true);
  });
});
