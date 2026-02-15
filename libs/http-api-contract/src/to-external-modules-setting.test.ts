/**
 * @fileoverview Tests toExternalModulesSetting behavior.
 */
import { describe, expect, it } from "bun:test";
import { toExternalModulesSetting } from "./to-external-modules-setting";

describe("toExternalModulesSetting", () => {
  it("trims module names and omits empty arrays", () => {
    expect(toExternalModulesSetting([" aws-sdk ", "zod"])).toEqual(["aws-sdk", "zod"]);
    expect(toExternalModulesSetting([])).toBeUndefined();
    expect(toExternalModulesSetting(undefined)).toBeUndefined();
  });

  it("throws for invalid values", () => {
    expect(() => toExternalModulesSetting("not-array")).toThrow(
      'Setting "externalModules" must be an array of strings',
    );
    expect(() => toExternalModulesSetting([""])).toThrow(
      'Setting "externalModules[0]" must not be empty',
    );
  });
});
