/**
 * @fileoverview Tests toHttpRequestParts behavior.
 */
import { describe, expect, it } from "bun:test";
import { toHttpRequestParts } from "./to-http-request-parts";

describe("toHttpRequestParts", () => {
  it("normalizes query params and lower-cases headers", () => {
    const requestParts = toHttpRequestParts(
      new URL("http://localhost/users?id=1&search=sam"),
      new Headers({ "X-Request-ID": "req-1" }),
    );

    expect(requestParts).toEqual({
      headers: {
        "x-request-id": "req-1",
      },
      query: {
        id: "1",
        search: "sam",
      },
    });
  });
});
