/**
 * @fileoverview Implements to state key.
 */
import type { TerraformStateSettings } from "./contract-generator-types";

/**
 * Converts to state key.
 * @param _state - State parameter.
 * @example
 * toStateKey(_state)
 * @returns Output value.
 */
export function toStateKey(_state: TerraformStateSettings): string {
  return "terraform.tfstate";
}
