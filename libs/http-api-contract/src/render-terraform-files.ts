/**
 * @fileoverview Implements render terraform files.
 */
import type { TerraformResourceSelection } from "./contract-generator-types";
import { createApiGatewayTerraformJson } from "./create-api-gateway-terraform-json";
import { createApiGatewayLambdaBindingsTerraformJson } from "./create-api-gateway-lambda-bindings-terraform-json";
import { createDynamodbTerraformJson } from "./create-dynamodb-terraform-json";
import { createLambdasTerraformJson } from "./create-lambdas-terraform-json";
import { createProviderTerraformJson } from "./create-provider-terraform-json";
import { createSqsTerraformJson } from "./create-sqs-terraform-json";
import { createStepFunctionsTerraformJson } from "./create-step-functions-terraform-json";
import { toTerraformJsonString } from "./to-terraform-json-string";
import type { TerraformRenderSettings } from "./terraform-render-types";
import type { SqsListenerRuntimeDefinition } from "@babbstack/sqs";
import type { EndpointRuntimeDefinition } from "./types";
import type { Contract } from "./types";

/**
 * Runs render terraform files.
 * @param contract - Contract parameter.
 * @param endpoints - Endpoints parameter.
 * @param sqsListeners - Sqs listeners parameter.
 * @param settings - Settings parameter.
 * @example
 * renderTerraformFiles(contract, endpoints, sqsListeners, settings)
 * @returns Output value.
 */
export function renderTerraformFiles(
  contract: Contract,
  endpoints: ReadonlyArray<EndpointRuntimeDefinition>,
  sqsListeners: ReadonlyArray<SqsListenerRuntimeDefinition>,
  settings: TerraformRenderSettings,
): Record<string, string> {
  const appName = settings.appName.length > 0 ? settings.appName : contract.deployContract.apiName;
  const resources: TerraformResourceSelection = settings.resources;
  const files: Record<string, string> = {
    "provider.tf.json": toTerraformJsonString(createProviderTerraformJson(settings, appName)),
  };

  if (resources.apiGateway) {
    files["api-gateway.tf.json"] = toTerraformJsonString(createApiGatewayTerraformJson(contract));
  }

  if (resources.lambdas) {
    files["lambdas.tf.json"] = toTerraformJsonString(
      createLambdasTerraformJson(
        contract,
        endpoints,
        sqsListeners,
        settings.lambdaExternalModulesByRoute,
        resources.dynamodb,
        resources.sqs,
      ),
    );
  }

  if (resources.apiGateway && resources.lambdas) {
    files["api-gateway-lambda-bindings.tf.json"] = toTerraformJsonString(
      createApiGatewayLambdaBindingsTerraformJson(),
    );
  }

  if (resources.dynamodb) {
    files["dynamodb.tf.json"] = toTerraformJsonString(createDynamodbTerraformJson(endpoints));
  }

  if (resources.sqs) {
    files["sqs.tf.json"] = toTerraformJsonString(
      createSqsTerraformJson(endpoints, sqsListeners, !resources.lambdas),
    );
  }

  if (resources.stepFunctions) {
    files["step-functions.tf.json"] = toTerraformJsonString(
      createStepFunctionsTerraformJson(
        endpoints,
        sqsListeners,
        resources.apiGateway,
        resources.sqs,
      ),
    );
  }

  return files;
}
