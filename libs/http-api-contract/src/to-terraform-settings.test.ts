/**
 * @fileoverview Tests toTerraformSettings behavior.
 */
import { describe, expect, it } from "bun:test";
import { toTerraformSettings } from "./to-terraform-settings";

describe("toTerraformSettings", () => {
  it("returns disabled terraform settings when enabled is false", () => {
    const settings = toTerraformSettings(
      {
        enabled: false,
      },
      (value, settingName, options) => {
        if (typeof value === "string") {
          return value;
        }

        if (!options.required) {
          return options.defaultValue ?? "";
        }

        throw new Error(`Missing required setting: ${settingName}`);
      },
    );

    expect(settings).toEqual({
      enabled: false,
      outputDirectory: "",
      region: "",
      resources: {
        apiGateway: false,
        dynamodb: false,
        lambdas: false,
        sqs: false,
        stepFunctions: false,
      },
    });
  });

  it("parses enabled terraform settings", () => {
    const settings = toTerraformSettings(
      {
        enabled: true,
        outputDirectory: "dist/terraform",
        resources: {
          apiGateway: true,
          dynamodb: false,
          lambdas: true,
          sqs: true,
          stepFunctions: true,
        },
      },
      (value, settingName, options) => {
        if (typeof value === "string") {
          return value;
        }

        if (!options.required) {
          return options.defaultValue ?? "";
        }

        throw new Error(`Missing required setting: ${settingName}`);
      },
    );

    expect(settings).toEqual({
      enabled: true,
      outputDirectory: "dist/terraform",
      region: "us-east-1",
      resources: {
        apiGateway: true,
        dynamodb: false,
        lambdas: true,
        sqs: true,
        stepFunctions: true,
      },
    });
  });
});
