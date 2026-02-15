/**
 * @fileoverview Tests toRequestCorrelationId behavior.
 */
import { describe, expect, it } from "bun:test";
import { toRequestCorrelationId } from "./to-request-correlation-id";

describe("toRequestCorrelationId", () => {
  it("uses incoming x-request-id when present", () => {
    const requestId = toRequestCorrelationId(
      new Request("http://localhost/test", {
        headers: {
          "x-request-id": "  req-123  ",
        },
      }),
    );

    expect(requestId).toBe("req-123");
  });

  it("generates an id when no header is present", () => {
    const requestId = toRequestCorrelationId(new Request("http://localhost/test"));

    expect(requestId.length).toBeGreaterThan(0);
  });
});
