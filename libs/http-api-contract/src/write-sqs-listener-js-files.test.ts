/**
 * @fileoverview Tests writeSqsListenerJsFiles behavior.
 */
import { describe, expect, it } from "bun:test";
import { writeSqsListenerJsFiles } from "./write-sqs-listener-js-files";

describe("writeSqsListenerJsFiles", () => {
  it("fails fast when output directory is missing", async () => {
    await expect(
      writeSqsListenerJsFiles(" ", [], {
        endpointModulePath: import.meta.url,
      }),
    ).rejects.toThrow("outputDirectory is required");
  });
});
