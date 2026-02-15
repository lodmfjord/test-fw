/**
 * @fileoverview Tests logDevAppFailure behavior.
 */
import { describe, expect, it } from "bun:test";
import { logDevAppFailure } from "./log-dev-app-failure";

describe("logDevAppFailure", () => {
  it("logs normalized error metadata", () => {
    const messages: unknown[] = [];
    const originalConsoleError = console.error;
    console.error = (value?: unknown) => {
      messages.push(value);
    };

    logDevAppFailure({
      error: new Error("boom"),
      event: "dev_app.handler_execution_failed",
      method: "GET",
      path: "/users",
      requestId: "req-1",
      routeId: "get_users",
    });

    console.error = originalConsoleError;

    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual(
      expect.objectContaining({
        errorMessage: "boom",
        errorName: "Error",
        event: "dev_app.handler_execution_failed",
        method: "GET",
        path: "/users",
        requestId: "req-1",
        routeId: "get_users",
      }),
    );
  });
});
