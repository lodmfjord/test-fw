/**
 * @fileoverview Implements terraform render types.
 */
import type { TerraformGeneratorSettings } from "./contract-generator-types";

export type TerraformJson = Record<string, unknown>;

export type TerraformRenderSettings = Pick<
  TerraformGeneratorSettings,
  "region" | "resources" | "state"
> & {
  appName: string;
  lambdaExternalModulesByRoute?: Record<string, string[]>;
  prefix: string;
};
