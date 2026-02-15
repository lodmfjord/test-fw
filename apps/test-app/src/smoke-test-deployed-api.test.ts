/**
 * @fileoverview Tests smoke test deployed api.
 */
import { describe, expect, it } from "bun:test";
import type { Logger } from "@babbstack/logger";
import { runSmokeTestDeployedApi } from "./smoke-test-deployed-api";

const baseUrl = "https://example.execute-api.eu-west-1.amazonaws.com/";
const s3BucketName = "test-app-s3-demo";
const s3ObjectKey = "smoke-test-object.txt";
const s3ObjectBody = "hello from smoke test";
const orderId = "smoke-order-123";
const eventId = "smoke-event-123";

type DeployedFetch = (
  input: string | URL | Request,
  init?: RequestInit | undefined,
) => Promise<Response>;

/** Creates deployed fetch impl. */
function createFetchImpl(calls: string[]): DeployedFetch {
  return async (input: string | URL | Request, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const bodyText = await request.text();
    const key = `${request.method} ${url.pathname}${url.search} ${bodyText}`;
    calls.push(key);

    switch (key) {
      case "GET /last-update ":
        return Response.json({
          time: new Date("2024-01-01T00:00:00.000Z").toISOString(),
        });
      case "GET /env-demo ":
        return Response.json({
          plain: "plain-value-from-endpoint-override",
          secret: "resolved-secret",
        });
      case `POST /s3-demo/files {"content":"${s3ObjectBody}","contentType":"text/plain","key":"${s3ObjectKey}"}`:
        return Response.json({
          bucketName: s3BucketName,
          contentType: "text/plain",
          key: s3ObjectKey,
          size: s3ObjectBody.length,
        });
      case `GET /s3-demo/files?key=${s3ObjectKey} `:
        return Response.json({
          bucketName: s3BucketName,
          content: s3ObjectBody,
          contentType: "text/plain",
          key: s3ObjectKey,
          size: s3ObjectBody.length,
        });
      case `GET /s3-demo/files/raw?key=${s3ObjectKey} `:
        return new Response(s3ObjectBody, {
          headers: {
            "content-type": "text/plain",
          },
        });
      case "GET /s3-demo/files/list?prefix=smoke-test ":
        return Response.json({
          items: [
            {
              bucketName: s3BucketName,
              contentType: "text/plain",
              key: s3ObjectKey,
              size: s3ObjectBody.length,
            },
          ],
        });
      case `GET /s3-demo/secure-link?key=${s3ObjectKey}&operation=get `:
        return Response.json({
          url: `https://example.com/${s3ObjectKey}`,
        });
      case `PUT /order/${orderId} {"amount":42}`:
        return Response.json({
          amount: 42,
          id: orderId,
          status: "updated",
        });
      case `PATCH /order/${orderId} {"status":"shipped"}`:
        return Response.json({
          id: orderId,
          status: "shipped",
        });
      case `HEAD /order/${orderId} `:
        return new Response("", {
          headers: {
            "x-order-id": orderId,
          },
          status: 200,
        });
      case "OPTIONS /order ":
        return new Response("", {
          status: 204,
        });
      case `DELETE /order/${orderId} `:
        return Response.json({
          deleted: true,
          id: orderId,
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
      case "POST /step-function-random-branch ":
        return Response.json({
          branch: "low",
          message: "generated 25, so branch is low (< 51)",
          random: 25,
        });
      case `POST /step-function-events {"eventId":"${eventId}"}`:
        return Response.json({
          accepted: true,
          eventId,
        });
      default:
        return new Response("not found", { status: 404 });
    }
  };
}

describe("runSmokeTestDeployedApi", () => {
  it("checks all deployed endpoints by method, status, and response shape", async () => {
    const calls: string[] = [];

    const result = await runSmokeTestDeployedApi(baseUrl, {
      fetchImpl: createFetchImpl(calls),
      log: () => {},
    });

    expect(result).toEqual({
      failed: 0,
      passed: 16,
      total: 16,
    });
    expect(calls).toEqual([
      "GET /last-update ",
      "GET /env-demo ",
      `POST /s3-demo/files {"content":"${s3ObjectBody}","contentType":"text/plain","key":"${s3ObjectKey}"}`,
      `GET /s3-demo/files?key=${s3ObjectKey} `,
      `GET /s3-demo/files/raw?key=${s3ObjectKey} `,
      "GET /s3-demo/files/list?prefix=smoke-test ",
      `GET /s3-demo/secure-link?key=${s3ObjectKey}&operation=get `,
      `PUT /order/${orderId} {"amount":42}`,
      `PATCH /order/${orderId} {"status":"shipped"}`,
      `HEAD /order/${orderId} `,
      "OPTIONS /order ",
      `DELETE /order/${orderId} `,
      'POST /step-function-demo {"value":"demo"}',
      'POST /step-function-demo {"value":1}',
      "POST /step-function-random-branch ",
      `POST /step-function-events {"eventId":"${eventId}"}`,
    ]);
  });

  it("prefers options.logger over options.log", async () => {
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

    const result = await runSmokeTestDeployedApi(baseUrl, {
      fetchImpl: createFetchImpl([]),
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
