/**
 * @fileoverview Tests toRequiredRuntimeExternalModules behavior.
 */
import { describe, expect, it } from "bun:test";
import { toRequiredRuntimeExternalModules } from "./to-required-runtime-external-modules";

describe("toRequiredRuntimeExternalModules", () => {
  it("always includes zod and normalizes additional modules", () => {
    expect(toRequiredRuntimeExternalModules(undefined)).toEqual(["zod"]);
    expect(toRequiredRuntimeExternalModules([" aws-sdk ", "zod", ""])).toEqual(["aws-sdk", "zod"]);
  });
});
