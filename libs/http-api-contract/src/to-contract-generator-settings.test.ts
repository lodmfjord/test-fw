/**
 * @fileoverview Tests toContractGeneratorSettings behavior.
 */
import { describe, expect, it } from "bun:test";
import { toContractGeneratorSettings } from "./to-contract-generator-settings";

describe("toContractGeneratorSettings", () => {
  it("parses required fields and applies defaults", () => {
    const settings = toContractGeneratorSettings({
      contractModulePath: "./contract.ts",
      contractsOutputDirectory: "./dist/contracts",
      endpointModulePath: "./endpoints.ts",
      externalModules: [" zod "],
      lambdaOutputDirectory: "./dist/lambda",
    });

    expect(settings.contractExportName).toBe("contract");
    expect(settings.endpointExportName).toBe("endpoints");
    expect(settings.externalModules).toEqual(["zod"]);
  });

  it("throws for missing required fields", () => {
    expect(() => toContractGeneratorSettings({})).toThrow(
      "Missing required setting: contractModulePath",
    );
  });
});
