/**
 * @fileoverview Implements create lambdas terraform json.
 */
import type { SqsListenerRuntimeDefinition } from "@babbstack/sqs";
import { createLambdasTerraformJsonHelpers } from "./create-lambdas-terraform-json-helpers";
import { createLambdasTerraformJsonResourceHelpers } from "./create-lambdas-terraform-json-resource-helpers";
import { toLambdaLayerMetadata } from "./to-lambda-layer-metadata";
import { toLambdaSecretEnvMetadata } from "./to-lambda-secret-env-metadata";
import { toRouteDynamodbAccess } from "./to-lambda-terraform-metadata";
import { toRouteS3Access } from "./to-s3-lambda-metadata";
import { toRouteSqsSendAccess } from "./to-sqs-lambda-metadata";
import { toSqsListenersById } from "./to-sqs-listeners-by-id";
import type { Contract, EndpointRuntimeDefinition } from "./types";

type TerraformJson = Record<string, unknown>;

/** Converts to terraform reference. */
function toTerraformReference(expression: string): string {
  return `\${${expression}}`;
}

/** Converts to managed s3 buckets by key. */
function toS3BucketsByKey(
  routeS3Access: Record<string, { bucket_key: string; bucket_name: string }>,
): Record<string, { bucket_name: string }> {
  const entries = Object.values(routeS3Access)
    .sort((left, right) => left.bucket_key.localeCompare(right.bucket_key))
    .map((item) => [item.bucket_key, { bucket_name: item.bucket_name }] as const);

  return Object.fromEntries(entries);
}

/**
 * Creates lambdas terraform json.
 * @param contract - Contract parameter.
 * @param endpoints - Endpoints parameter.
 * @param sqsListeners - Sqs listeners parameter.
 * @param lambdaExternalModulesByRoute - Lambda external modules by route parameter.
 * @param usesManagedDynamodbTables - Uses managed dynamodb tables parameter.
 * @param usesManagedSqsQueues - Uses managed sqs queues parameter.
 * @example
 * createLambdasTerraformJson(contract, endpoints, sqsListeners, lambdaExternalModulesByRoute, usesManagedDynamodbTables, usesManagedSqsQueues)
 * @returns Output value.
 */
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
  const hasRouteEphemeralStorageMb = contract.lambdasManifest.functions.some(
    (lambdaFunction) => lambdaFunction.ephemeralStorageMb !== undefined,
  );
  const routeDynamodbAccess = toRouteDynamodbAccess(endpoints);
  const hasRouteMemoryMb = contract.lambdasManifest.functions.some(
    (lambdaFunction) => lambdaFunction.memoryMb !== undefined,
  );
  const hasRouteReservedConcurrency = contract.lambdasManifest.functions.some(
    (lambdaFunction) => lambdaFunction.reservedConcurrency !== undefined,
  );
  const routeS3Access = toRouteS3Access(endpoints);
  const routeSqsSendAccess = toRouteSqsSendAccess(endpoints);
  const s3BucketsByKey = toS3BucketsByKey(routeS3Access);
  const lambdaSecretEnvMetadata = toLambdaSecretEnvMetadata(contract);
  const hasRouteTimeoutSeconds = contract.lambdasManifest.functions.some(
    (lambdaFunction) => lambdaFunction.timeoutSeconds !== undefined,
  );
  const sqsListenersById = toSqsListenersById(sqsListeners);
  const hasRouteDynamodbAccess = Object.keys(routeDynamodbAccess).length > 0;
  const hasRouteSecretEnvParameters =
    Object.keys(lambdaSecretEnvMetadata.parameterNameByKey).length > 0;
  const hasRouteS3Access = Object.keys(routeS3Access).length > 0;
  const hasRouteSqsSendAccess = Object.keys(routeSqsSendAccess).length > 0;
  const hasSqsListeners = Object.keys(sqsListenersById).length > 0;
  const hasUnmanagedSqsReferences =
    (hasRouteSqsSendAccess || hasSqsListeners) && !usesManagedSqsQueues;
  const hasUnmanagedDynamodbReferences = hasRouteDynamodbAccess && !usesManagedDynamodbTables;
  const context = {
    hasLayers,
    hasRouteEphemeralStorageMb,
    hasRouteDynamodbAccess,
    hasRouteMemoryMb,
    hasRouteReservedConcurrency,
    hasRouteSecretEnvParameters,
    hasRouteS3Access,
    hasRouteSqsSendAccess,
    hasRouteTimeoutSeconds,
    hasSqsListeners,
    layerMetadata,
    routeDynamodbAccess,
    routeSecretEnvParameterKeysByRoute: lambdaSecretEnvMetadata.parameterKeysByRoute,
    routeS3Access,
    routeSqsSendAccess,
    s3BucketsByKey,
    secretEnvParameterNameByKey: lambdaSecretEnvMetadata.parameterNameByKey,
    sqsListenersById,
    usesManagedDynamodbTables,
    usesManagedSqsQueues,
  };
  const routeConfig = createLambdasTerraformJsonHelpers.toRouteConfig(context);
  const sqsListenerConfig = createLambdasTerraformJsonHelpers.toSqsListenerConfig(context);
  const iamRolePolicies = createLambdasTerraformJsonHelpers.toIamRolePolicies(context);
  const data: Record<string, unknown> = {};

  if (hasUnmanagedDynamodbReferences || hasUnmanagedSqsReferences) {
    data.aws_caller_identity = {
      current: {},
    };
  }
  if (hasRouteSecretEnvParameters) {
    data.aws_ssm_parameter = {
      lambda_secret_env: {
        for_each: toTerraformReference("local.lambda_secret_env_parameter_name_by_key"),
        name: toTerraformReference("each.value"),
        with_decryption: true,
      },
    };
  }

  return {
    locals: createLambdasTerraformJsonHelpers.toLocals(contract, context),
    ...(Object.keys(data).length > 0 ? { data } : {}),
    resource: createLambdasTerraformJsonResourceHelpers.toResourceBlock(
      context,
      iamRolePolicies,
      routeConfig,
      sqsListenerConfig,
    ),
    variable: createLambdasTerraformJsonResourceHelpers.toVariableBlock(context),
  };
}
