/**
 * @fileoverview Tests createApiGatewayTerraformJson behavior.
 */
import { describe, expect, it } from "bun:test";
import { createApiGatewayTerraformJson } from "./create-api-gateway-terraform-json";

describe("createApiGatewayTerraformJson", () => {
  it("renders cors configuration and default stage resources", () => {
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
  });
});
