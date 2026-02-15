/** @fileoverview Implements to terraform json string. @module libs/http-api-contract/src/to-terraform-json-string */
/** @example `toTerraformJsonString(input)` */ export function toTerraformJsonString(
  value: unknown,
): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
