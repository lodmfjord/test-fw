/** @fileoverview Implements test app contract. @module apps/test-app/src/test-app-contract */
import { buildContractFromEndpoints } from "@babbstack/http-api-contract";
import { endpoints } from "./endpoints";

export const testAppContract = buildContractFromEndpoints({
  apiName: "test-app-api",
  version: "0.1.0",
  endpoints: endpoints.flat(),
});
