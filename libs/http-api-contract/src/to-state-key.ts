/** @fileoverview Implements to state key. @module libs/http-api-contract/src/to-state-key */
import type { TerraformStateSettings } from "./contract-generator-types";

/** Converts values to state key. @example `toStateKey(input)` */
export function toStateKey(_state: TerraformStateSettings): string {
  return "terraform.tfstate";
}
