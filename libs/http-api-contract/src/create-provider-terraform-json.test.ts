/**
 * @fileoverview Tests createProviderTerraformJson behavior.
 */
import { describe, expect, it } from "bun:test";
import { createProviderTerraformJson } from "./create-provider-terraform-json";

describe("createProviderTerraformJson", () => {
  it("renders provider variables and terraform backend defaults", () => {
    const terraformJson = createProviderTerraformJson(
      {
        appName: "demo",
        prefix: "simple",
        region: "us-east-1",
        resources: {
          apiGateway: true,
          dynamodb: true,
          lambdas: true,
          sqs: true,
          stepFunctions: true,
        },
      },
      "demo",
    ) as {
      terraform: {
        backend?: {
          s3: {
            key: string;
          };
        };
      };
      variable: {
        app_name: { default: string };
      };
    };

    expect(terraformJson.variable.app_name.default).toBe("demo");
    expect(terraformJson.terraform.backend?.s3.key).toBe("terraform.tfstate");
  });
});
