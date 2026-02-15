/**
 * @fileoverview Tests create dev app content type.
 */
import { describe, expect, it } from "bun:test";
import { schema } from "@babbstack/schema";
import { createDevApp } from "./create-dev-app";
import { defineEndpoint } from "./define-endpoint";

describe("createDevApp contentType", () => {
  it("uses custom contentType from handler output", async () => {
    const fetch = createDevApp([
      defineEndpoint({
        method: "GET",
        path: "/text",
        handler: () => ({
          contentType: "text/plain",
          value: "ok",
        }),
        response: schema.string(),
      }),
    ]);

    const response = await fetch(new Request("http://local/text", { method: "GET" }));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/plain");
    expect(await response.text()).toBe("ok");
  });

  it("returns buffer values as binary response body in dev", async () => {
    const fetch = createDevApp([
      defineEndpoint({
        method: "GET",
        path: "/binary",
        handler: () => ({
          contentType: "application/octet-stream",
          value: Buffer.from([0, 1, 2, 3]),
        }),
        response: schema.string(),
      }),
    ]);

    const response = await fetch(new Request("http://local/binary", { method: "GET" }));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/octet-stream");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(Buffer.from([0, 1, 2, 3]));
  });

  it("returns custom headers from handler output", async () => {
    const fetch = createDevApp([
      defineEndpoint({
        method: "GET",
        path: "/headers",
        handler: () => ({
          headers: {
            "x-trace-id": "abc-123",
          },
          value: "ok",
        }),
        response: schema.string(),
      }),
    ]);

    const response = await fetch(new Request("http://local/headers", { method: "GET" }));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-trace-id")).toBe("abc-123");
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(await response.text()).toBe('"ok"');
  });
});
