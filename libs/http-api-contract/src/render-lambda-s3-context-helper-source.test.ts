/**
 * @fileoverview Tests render lambda s3 context helper source behavior.
 */
import { describe, expect, it } from "bun:test";
import { toS3ContextHelperSource } from "./render-lambda-s3-context-helper-source";

describe("toS3ContextHelperSource", () => {
  it("returns helper source for scoped s3 context bindings", () => {
    const source = toS3ContextHelperSource();

    expect(source).toContain("function toS3ForContext(client, config)");
    expect(source).toContain("createSimpleApiCreateBucket");
    expect(source).toContain("S3 context does not allow read access");
    expect(source).toContain("S3 context does not allow write access");
  });
});
