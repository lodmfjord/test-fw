/**
 * @fileoverview Tests createApiGatewayLambdaBindingsTerraformJson behavior.
 */
import { describe, expect, it } from "bun:test";
import { createApiGatewayLambdaBindingsTerraformJson } from "./create-api-gateway-lambda-bindings-terraform-json";

describe("createApiGatewayLambdaBindingsTerraformJson", () => {
  it("renders api gateway route, integration, and invoke permission resources", () => {
    const terraformJson = createApiGatewayLambdaBindingsTerraformJson() as {
      resource: Record<string, Record<string, Record<string, unknown>>>;
    };

    expect(terraformJson.resource.aws_apigatewayv2_integration?.route).toBeDefined();
    expect(terraformJson.resource.aws_apigatewayv2_route?.route?.route_key).toContain(
      "each.value.method",
    );
    expect(terraformJson.resource.aws_lambda_permission?.apigw_invoke).toBeDefined();
  });
});
