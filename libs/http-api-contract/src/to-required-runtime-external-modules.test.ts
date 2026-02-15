/**
 * @fileoverview Tests toRequiredRuntimeExternalModules behavior.
 */
import { describe, expect, it } from "bun:test";
import { toRequiredRuntimeExternalModules } from "./to-required-runtime-external-modules";

describe("toRequiredRuntimeExternalModules", () => {
  it("always includes required runtime modules and normalizes additional modules", () => {
    expect(toRequiredRuntimeExternalModules(undefined)).toEqual([
      "@aws-lambda-powertools/logger",
      "zod",
    ]);
    expect(toRequiredRuntimeExternalModules([" aws-sdk ", "zod", ""])).toEqual([
      "@aws-lambda-powertools/logger",
      "aws-sdk",
      "zod",
    ]);
  });
});
