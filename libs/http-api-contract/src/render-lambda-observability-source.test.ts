/**
 * @fileoverview Tests toLambdaObservabilitySupportSource behavior.
 */
import { describe, expect, it } from "bun:test";
import { toLambdaObservabilitySupportSource } from "./render-lambda-observability-source";

describe("toLambdaObservabilitySupportSource", () => {
  it("returns observability helpers used by generated lambda runtime", () => {
    const source = toLambdaObservabilitySupportSource();

    expect(source).toContain("function createInvocationLogContext");
    expect(source).toContain("function logInvocationStart");
    expect(source).toContain("lambda.invocation.complete");
    expect(source).toContain("function logOutputValidationFailure");
  });

  it("returns a stable source string", () => {
    expect(toLambdaObservabilitySupportSource()).toBe(toLambdaObservabilitySupportSource());
  });
});
