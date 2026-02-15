/**
 * @fileoverview Builds deployed smoke-test endpoint expectations across all test-app routes.
 */
import { toSmokeTestOrderAndStepFunctionEndpointExpectations } from "./to-smoke-test-order-and-step-function-endpoint-expectations";
import { toSmokeTestS3AndEnvEndpointExpectations } from "./to-smoke-test-s3-and-env-endpoint-expectations";
import type { EndpointExpectation } from "./smoke-test-deployed-api-types";

/**
 * Converts to deployed endpoint expectations.
 * @example
 * toSmokeTestDeployedEndpointExpectations()
 * @returns Output value.
 */
export function toSmokeTestDeployedEndpointExpectations(): EndpointExpectation[] {
  return [
    ...toSmokeTestS3AndEnvEndpointExpectations(),
    ...toSmokeTestOrderAndStepFunctionEndpointExpectations(),
  ];
}
