/**
 * @fileoverview Tests toNormalizedGlobalCors behavior.
 */
import { describe, expect, it } from "bun:test";
import { toNormalizedGlobalCors } from "./to-normalized-global-cors";

describe("toNormalizedGlobalCors", () => {
  it("normalizes cors lists and trims allowOrigin", () => {
    const cors = toNormalizedGlobalCors({
      allowHeaders: [" X-Test ", "X-Test", ""],
      allowOrigin: " https://example.com ",
      exposeHeaders: [" X-Trace "],
      maxAgeSeconds: 300,
    });

    expect(cors).toEqual({
      allowHeaders: ["X-Test"],
      allowOrigin: "https://example.com",
      exposeHeaders: ["X-Trace"],
      maxAgeSeconds: 300,
    });
  });

  it("throws for invalid maxAgeSeconds", () => {
    expect(() =>
      toNormalizedGlobalCors({
        allowOrigin: "*",
        maxAgeSeconds: -1,
      }),
    ).toThrow("cors.maxAgeSeconds must be a non-negative integer");
  });
});
