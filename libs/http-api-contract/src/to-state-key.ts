import type { TerraformStateSettings } from "./contract-generator-types";

export function toStateKey(_state: TerraformStateSettings): string {
  return "terraform.tfstate";
}
