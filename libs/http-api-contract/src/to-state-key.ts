/**
 * @fileoverview Implements to state key.
 */
import type { TerraformStateSettings } from "./contract-generator-types";

/**
 * Converts values to state key.
 * @param _state - State parameter.
 * @example
 * toStateKey(_state)
 */
export function toStateKey(_state: TerraformStateSettings): string {
  return "terraform.tfstate";
}
