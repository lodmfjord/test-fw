/**
 * @fileoverview Tests toDevAppResponse behavior.
 */
import { describe, expect, it } from "bun:test";
import { toDevAppResponse } from "./to-dev-app-response";

describe("toDevAppResponse", () => {
  it("builds a response with request id and content type", async () => {
    const response = toDevAppResponse(200, { ok: true }, undefined, { "x-extra": "1" }, "req-1");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("x-request-id")).toBe("req-1");
    expect(response.headers.get("x-extra")).toBe("1");
    expect(await response.text()).toBe('{"ok":true}');
  });
});
