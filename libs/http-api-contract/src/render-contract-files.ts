/** @fileoverview Implements render contract files. @module libs/http-api-contract/src/render-contract-files */
import type { Contract } from "./types";

/** Handles format json. */
function formatJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/** Handles render contract files. @example `renderContractFiles(input)` */
export function renderContractFiles(contract: Contract): Record<string, string> {
  return {
    "deploy.contract.json": formatJson(contract.deployContract),
    "env.schema.json": formatJson(contract.envSchema),
    "lambdas.manifest.json": formatJson(contract.lambdasManifest),
    "openapi.json": formatJson(contract.openapi),
    "routes.manifest.json": formatJson(contract.routesManifest),
  };
}
