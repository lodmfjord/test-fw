/**
 * @fileoverview Implements to terraform json string.
 */
/**
 * Converts values to terraform json string.
 * @param value - Value parameter.
 * @example
 * toTerraformJsonString(value)
 */ export function toTerraformJsonString(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
