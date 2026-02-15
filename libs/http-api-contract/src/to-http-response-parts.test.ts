/**
 * @fileoverview Tests toHttpResponseParts behavior.
 */
import { describe, expect, it } from "bun:test";
import { toHttpResponseParts } from "./to-http-response-parts";

describe("toHttpResponseParts", () => {
  it("encodes objects as JSON strings by default", () => {
    const responseParts = toHttpResponseParts({ ok: true });

    expect(responseParts.contentType).toBe("application/json");
    expect(responseParts.body).toBe('{"ok":true}');
  });

  it("returns a Blob for Buffer payloads", async () => {
    const responseParts = toHttpResponseParts(Buffer.from("abc"));

    expect(responseParts.contentType).toBe("application/octet-stream");
    expect(responseParts.body instanceof Blob).toBe(true);
    expect(await (responseParts.body as Blob).text()).toBe("abc");
  });
});
