import { beforeEach, describe, expect, it } from "bun:test";
import { schema } from "@babbstack/schema";
import { buildContractFromEndpoints } from "./build-contract-from-endpoints";
import { defineGet } from "./define-get";
import { listDefinedEndpoints } from "./list-defined-endpoints";
import { renderTerraformFiles } from "./render-terraform-files";
import { resetDefinedEndpoints } from "./reset-defined-endpoints";

describe("renderTerraformFiles stage naming", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("keeps stage name as literal $default without prefixing", () => {
    defineGet({
      path: "/health",
      handler: () => ({
        value: {
          status: "ok",
        },
      }),
      response: schema.object({
        status: schema.string(),
      }),
    });

    const endpoints = listDefinedEndpoints();
    const contract = buildContractFromEndpoints({
      apiName: "terraform-stage-test",
      endpoints,
      version: "1.0.0",
    });
    const files = renderTerraformFiles(contract, endpoints, {
      appName: "test-app",
      prefix: "babbstack",
      region: "eu-west-1",
      resources: {
        apiGateway: true,
        dynamodb: false,
        lambdas: false,
      },
    });
    const apiGatewayJson = JSON.parse(files["api-gateway.tf.json"] ?? "") as {
      resource: {
        aws_apigatewayv2_stage: {
          default: {
            name: string;
          };
        };
      };
    };

    expect(apiGatewayJson.resource.aws_apigatewayv2_stage.default.name).toBe(
      `\${var.stage_name == "$default" ? var.stage_name : join("", [local.resource_name_prefix, var.stage_name])}`,
    );
  });
});
