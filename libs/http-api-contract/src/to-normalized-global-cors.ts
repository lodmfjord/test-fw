/**
 * @fileoverview Implements to normalized global cors.
 */
import type { GlobalCors } from "./cors-types";
import type { BuildContractInput } from "./types";

/**
 * Converts to normalized global cors.
 * @param input - Input parameter.
 * @example
 * toNormalizedGlobalCors(input)
 * @returns Output value.
 * @throws Error when operation fails.
 */
export function toNormalizedGlobalCors(input: BuildContractInput["cors"]): GlobalCors | undefined {
  if (!input) {
    return undefined;
  }

  const allowOrigin = input.allowOrigin.trim();
  if (allowOrigin.length === 0) {
    throw new Error("cors.allowOrigin is required");
  }

  if (input.maxAgeSeconds !== undefined) {
    if (!Number.isInteger(input.maxAgeSeconds) || input.maxAgeSeconds < 0) {
      throw new Error("cors.maxAgeSeconds must be a non-negative integer");
    }
  }

  /** Converts to normalized list. */ const toNormalizedList = (
    values: string[] | undefined,
    settingName: "allowHeaders" | "exposeHeaders",
  ): string[] | undefined => {
    if (values === undefined) {
      return undefined;
    }

    if (!Array.isArray(values)) {
      throw new Error(`cors.${settingName} must be an array of strings`);
    }

    const normalized = [...new Set(values.map((value) => value.trim()).filter((value) => value))];
    if (normalized.length === 0) {
      return undefined;
    }

    return normalized;
  };

  const allowHeaders = toNormalizedList(input.allowHeaders, "allowHeaders");
  const exposeHeaders = toNormalizedList(input.exposeHeaders, "exposeHeaders");

  return {
    ...(input.allowCredentials ? { allowCredentials: true } : {}),
    ...(allowHeaders ? { allowHeaders } : {}),
    allowOrigin,
    ...(exposeHeaders ? { exposeHeaders } : {}),
    ...(input.maxAgeSeconds !== undefined ? { maxAgeSeconds: input.maxAgeSeconds } : {}),
  };
}
