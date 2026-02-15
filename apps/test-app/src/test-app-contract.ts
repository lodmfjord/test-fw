/**
 * @fileoverview Implements test app contract.
 */
import { buildContractFromEndpoints } from "@babbstack/http-api-contract";
import { endpoints } from "./endpoints";

export const testAppContract = buildContractFromEndpoints({
  apiName: "test-app-api",
  lambdaDefaults: {
    timeoutSeconds: 15,
  },
  version: "0.1.0",
  endpoints: endpoints.flat(),
});
