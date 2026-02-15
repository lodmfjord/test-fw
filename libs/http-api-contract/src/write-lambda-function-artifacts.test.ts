/**
 * @fileoverview Tests writeLambdaFunctionArtifacts behavior.
 */
import { describe, expect, it } from "bun:test";
import { writeLambdaFunctionArtifacts } from "./write-lambda-function-artifacts";

describe("writeLambdaFunctionArtifacts", () => {
  it("returns no artifacts when no lambda functions are present", async () => {
    const fileNames = await writeLambdaFunctionArtifacts(
      "/tmp/simple-api-empty-artifacts",
      {
        functions: [],
      } as never,
      "/tmp/simple-api-empty-lambda",
    );

    expect(fileNames).toEqual([]);
  });
});
