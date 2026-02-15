/**
 * @fileoverview Tests create dev app observability.
 */
import { describe, expect, it } from "bun:test";
import type { Logger } from "@babbstack/logger";
import { createDevApp } from "./create-dev-app";
import { defineEndpoint } from "./define-endpoint";
import { schema } from "@babbstack/schema";

describe("createDevApp observability", () => {
  it("logs structured handler failures with request correlation id", async () => {
    const loggedEntries: unknown[] = [];
    const logger: Logger = {
      debug() {},
      error(_message, payload) {
        loggedEntries.push(payload);
      },
      getPersistentKeys() {
        return {};
      },
      info() {},
      warn() {},
    };
    const fetch = createDevApp(
      [
        defineEndpoint({
          method: "GET",
          path: "/boom",
          handler: () => {
            throw new Error("handler exploded");
          },
          response: schema.object({
            ok: schema.boolean(),
          }),
        }),
      ],
      {
        logger,
      },
    );

    const response = await fetch(
      new Request("http://local/boom", {
        method: "GET",
        headers: {
          "x-request-id": "req-123",
        },
      }),
    );

    expect(response.status).toBe(500);
    expect(response.headers.get("x-request-id")).toBe("req-123");
    expect((await response.json()) as { error?: string }).toEqual({
      error: "Handler execution failed",
    });
    expect(loggedEntries).toHaveLength(1);
    expect(loggedEntries[0]).toMatchObject({
      errorMessage: "handler exploded",
      errorName: "Error",
      event: "dev_app.handler_execution_failed",
      method: "GET",
      path: "/boom",
      requestId: "req-123",
      routeId: "get_boom",
    });
  });

  it("logs structured output validation failures with generated request ids", async () => {
    const loggedEntries: unknown[] = [];
    const logger: Logger = {
      debug() {},
      error(_message, payload) {
        loggedEntries.push(payload);
      },
      getPersistentKeys() {
        return {};
      },
      info() {},
      warn() {},
    };
    const fetch = createDevApp(
      [
        defineEndpoint({
          method: "GET",
          path: "/bad-output",
          handler: () => ({
            value: {
              id: 123,
            },
          }),
          response: schema.object({
            id: schema.string(),
          }),
        }),
      ],
      {
        logger,
      },
    );

    const response = await fetch(new Request("http://local/bad-output", { method: "GET" }));

    expect(response.status).toBe(500);
    expect((await response.json()) as { error?: string }).toEqual({
      error: "Output validation failed",
    });
    const requestId = response.headers.get("x-request-id");
    expect(typeof requestId).toBe("string");
    expect((requestId ?? "").length > 0).toBe(true);
    expect(loggedEntries).toHaveLength(1);
    expect(loggedEntries[0]).toMatchObject({
      event: "dev_app.output_validation_failed",
      method: "GET",
      path: "/bad-output",
      requestId,
      routeId: "get_bad_output",
    });
  });
});
