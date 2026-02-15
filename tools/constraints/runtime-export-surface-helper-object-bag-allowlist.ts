/**
 * @fileoverview Lists legacy file paths temporarily exempt from helper-object bag checks.
 */
const RUNTIME_EXPORT_SURFACE_HELPER_OBJECT_BAG_ALLOWLIST = new Set<string>([
  "apps/test-app/src/last-update-store.ts",
  "libs/http-api-contract/src/build-contract-helpers.ts",
  "libs/http-api-contract/src/create-lambdas-terraform-json-helpers.ts",
  "libs/http-api-contract/src/create-lambdas-terraform-json-resource-helpers.ts",
  "libs/http-api-contract/src/create-step-functions-terraform-json-common.ts",
  "libs/http-api-contract/src/create-step-functions-terraform-json-helpers.ts",
  "libs/http-api-contract/src/define-endpoint-helpers.ts",
  "libs/http-api-contract/src/lambda-layer-artifacts-helpers.ts",
  "libs/http-api-contract/src/render-lambda-runtime-source-blocks.ts",
  "libs/http-api-contract/src/render-used-import-lines-helpers.ts",
  "libs/s3/src/memory-s3-helpers.ts",
  "libs/s3/src/s3-aws-normalizers.ts",
  "libs/schema/src/schema-parity-helpers.ts",
  "libs/schema/src/schema.ts",
  "libs/step-functions/src/parse-step-function-definition-helpers.ts",
  "libs/step-functions/src/parse-step-function-state-builders.ts",
  "libs/step-functions/src/step-function-execution-utils.ts",
  "tools/constraints/find-documentation-constraints-bindings.ts",
  "tools/constraints/find-documentation-constraints-jsdoc.ts",
  "tools/constraints/find-module-constraints-errors-helpers.ts",
  "tools/constraints/find-src-function-density-errors-helpers.ts",
]);

export { RUNTIME_EXPORT_SURFACE_HELPER_OBJECT_BAG_ALLOWLIST };
