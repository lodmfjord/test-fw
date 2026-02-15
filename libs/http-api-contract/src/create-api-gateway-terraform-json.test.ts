/**
 * @fileoverview Tests createApiGatewayTerraformJson behavior.
 */
import { describe, expect, it } from "bun:test";
import { createApiGatewayTerraformJson } from "./create-api-gateway-terraform-json";

describe("createApiGatewayTerraformJson", () => {
  it("renders cors configuration and default stage resources", () => {
    const expectedApiGatewayUrl = `$${"{aws_apigatewayv2_api.http_api.api_endpoint}"}`;
    const expectedApiGatewayUrlWithStage = `$${"{aws_apigatewayv2_stage.default.invoke_url}"}`;
    const terraformJson = createApiGatewayTerraformJson({
      deployContract: {
        apiGateway: {
          cors: {
            allowOrigin: "*",
          },
          stageName: "$default",
        },
        apiName: "demo",
      },
      routesManifest: {
        routes: [{ method: "POST" }, { method: "GET" }],
      },
    } as never) as {
      output: {
        api_gateway_url?: {
          value: string;
        };
        api_gateway_url_with_stage?: {
          value: string;
        };
      };
      resource: {
        aws_apigatewayv2_api: {
          http_api: {
            cors_configuration?: {
              allow_methods: string[];
            };
          };
        };
      };
    };

    expect(
      terraformJson.resource.aws_apigatewayv2_api.http_api.cors_configuration?.allow_methods,
    ).toEqual(["GET", "POST"]);
    expect(terraformJson.output.api_gateway_url?.value).toBe(expectedApiGatewayUrl);
    expect(terraformJson.output.api_gateway_url_with_stage?.value).toBe(
      expectedApiGatewayUrlWithStage,
    );
  });
});
