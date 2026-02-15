/**
 * @fileoverview Tests writeLambdaJsFiles export behavior.
 */
import { describe, expect, it } from "bun:test";
import { writeLambdaJsFiles } from "./write-lambda-js-files-export";

describe("writeLambdaJsFiles export", () => {
  it("fails fast when output directory is missing", async () => {
    await expect(
      writeLambdaJsFiles(" ", [], {
        endpointModulePath: import.meta.url,
      }),
    ).rejects.toThrow("outputDirectory is required");
  });
});
