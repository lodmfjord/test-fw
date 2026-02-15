/**
 * @fileoverview Tests logDevAppFailure behavior.
 */
import { describe, expect, it } from "bun:test";
import type { Logger } from "@babbstack/logger";
import { logDevAppFailure } from "./log-dev-app-failure";

describe("logDevAppFailure", () => {
  it("logs normalized error metadata", () => {
    const messages: unknown[] = [];
    const logger: Logger = {
      debug() {},
      error(_message, payload) {
        messages.push(payload);
      },
      getPersistentKeys() {
        return {};
      },
      info() {},
      warn() {},
    };

    logDevAppFailure({
      error: new Error("boom"),
      event: "dev_app.handler_execution_failed",
      logger,
      method: "GET",
      path: "/users",
      requestId: "req-1",
      routeId: "get_users",
    });

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
