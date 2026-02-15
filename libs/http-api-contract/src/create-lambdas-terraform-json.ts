import type { SqsListenerRuntimeDefinition } from "@babbstack/sqs";
import { createLambdasTerraformJsonHelpers } from "./create-lambdas-terraform-json-helpers";
import { createLambdasTerraformJsonResourceHelpers } from "./create-lambdas-terraform-json-resource-helpers";
import { toLambdaLayerMetadata } from "./to-lambda-layer-metadata";
import { toRouteDynamodbAccess } from "./to-lambda-terraform-metadata";
import { toRouteSqsSendAccess } from "./to-sqs-lambda-metadata";
import { toSqsListenersById } from "./to-sqs-listeners-by-id";
import type { Contract, EndpointRuntimeDefinition } from "./types";

type TerraformJson = Record<string, unknown>;

export function createLambdasTerraformJson(
  contract: Contract,
  endpoints: ReadonlyArray<EndpointRuntimeDefinition>,
  sqsListeners: ReadonlyArray<SqsListenerRuntimeDefinition>,
  lambdaExternalModulesByRoute: Record<string, string[]> | undefined,
  usesManagedDynamodbTables: boolean,
  usesManagedSqsQueues: boolean,
): TerraformJson {
  const layerMetadata = toLambdaLayerMetadata(lambdaExternalModulesByRoute ?? {});
  const hasLayers = Object.keys(layerMetadata.layersByKey).length > 0;
  const routeDynamodbAccess = toRouteDynamodbAccess(endpoints);
  const routeSqsSendAccess = toRouteSqsSendAccess(endpoints);
  const sqsListenersById = toSqsListenersById(sqsListeners);
  const hasRouteDynamodbAccess = Object.keys(routeDynamodbAccess).length > 0;
  const hasRouteSqsSendAccess = Object.keys(routeSqsSendAccess).length > 0;
  const hasSqsListeners = Object.keys(sqsListenersById).length > 0;
  const hasUnmanagedSqsReferences =
    (hasRouteSqsSendAccess || hasSqsListeners) && !usesManagedSqsQueues;
  const hasUnmanagedDynamodbReferences = hasRouteDynamodbAccess && !usesManagedDynamodbTables;
  const context = {
    hasLayers,
    hasRouteDynamodbAccess,
    hasRouteSqsSendAccess,
    hasSqsListeners,
    layerMetadata,
    routeDynamodbAccess,
    routeSqsSendAccess,
    sqsListenersById,
    usesManagedDynamodbTables,
    usesManagedSqsQueues,
  };
  const routeConfig = createLambdasTerraformJsonHelpers.toRouteConfig(context);
  const sqsListenerConfig = createLambdasTerraformJsonHelpers.toSqsListenerConfig(context);
  const iamRolePolicies = createLambdasTerraformJsonHelpers.toIamRolePolicies(context);

  return {
    locals: createLambdasTerraformJsonHelpers.toLocals(contract, context),
    ...(hasUnmanagedDynamodbReferences || hasUnmanagedSqsReferences
      ? {
          data: {
            aws_caller_identity: {
              current: {},
            },
          },
        }
      : {}),
    resource: createLambdasTerraformJsonResourceHelpers.toResourceBlock(
      context,
      iamRolePolicies,
      routeConfig,
      sqsListenerConfig,
    ),
    variable: createLambdasTerraformJsonResourceHelpers.toVariableBlock(context),
  };
}
