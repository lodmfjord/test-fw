import type { TerraformJson } from "./terraform-render-types";

function toTerraformReference(expression: string): string {
  return `\${${expression}}`;
}

export function createApiGatewayLambdaBindingsTerraformJson(): TerraformJson {
  return {
    resource: {
      aws_apigatewayv2_integration: {
        route: {
          api_id: toTerraformReference("aws_apigatewayv2_api.http_api.id"),
          for_each: toTerraformReference("aws_lambda_function.route"),
          integration_type: "AWS_PROXY",
          integration_uri: toTerraformReference("each.value.invoke_arn"),
          payload_format_version: "2.0",
        },
      },
      aws_apigatewayv2_route: {
        route: {
          api_id: toTerraformReference("aws_apigatewayv2_api.http_api.id"),
          for_each: toTerraformReference("local.lambda_functions"),
          route_key: `${toTerraformReference("each.value.method")} ${toTerraformReference("each.value.path")}`,
          target: `integrations/${toTerraformReference("aws_apigatewayv2_integration.route[each.key].id")}`,
        },
      },
      aws_lambda_permission: {
        apigw_invoke: {
          action: "lambda:InvokeFunction",
          for_each: toTerraformReference("aws_lambda_function.route"),
          function_name: toTerraformReference("each.value.function_name"),
          principal: "apigateway.amazonaws.com",
          source_arn: `${toTerraformReference("aws_apigatewayv2_api.http_api.execution_arn")}/*/*`,
          statement_id: `AllowExecutionFromApiGateway-${toTerraformReference("each.key")}`,
        },
      },
    },
  };
}
