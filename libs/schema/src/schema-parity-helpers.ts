/**
 * @fileoverview Implements parity helpers for schema.fromZod.
 */
import type { ZodType } from "zod";

/** Checks whether record. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Converts values to unsupported zod construct. */
function toUnsupportedZodConstruct(zodSchema: ZodType<unknown>): string | undefined {
  const queue: unknown[] = [zodSchema];
  const visited = new Set<object>();

  while (queue.length > 0) {
    const next = queue.shift();
    if (!isRecord(next) || visited.has(next)) {
      continue;
    }
    visited.add(next);

    const definition = isRecord(next._def) ? next._def : isRecord(next.def) ? next.def : undefined;
    if (!definition) {
      for (const value of Object.values(next)) {
        if (Array.isArray(value)) {
          for (const item of value) {
            queue.push(item);
          }
          continue;
        }
        queue.push(value);
      }
      continue;
    }

    const definitionType = definition.type;
    if (definitionType === "pipe" || definitionType === "transform") {
      return "transforms/preprocess operations";
    }

    const checks = Array.isArray(definition.checks) ? definition.checks : [];
    for (const check of checks) {
      if (isRecord(check) && isRecord(check.def) && check.def.type === "custom") {
        return "custom refinements";
      }
      if (isRecord(check) && isRecord(check._def) && check._def.type === "custom") {
        return "custom refinements";
      }
      if (isRecord(check)) {
        queue.push(check);
      }
    }

    for (const value of Object.values(definition)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          queue.push(item);
        }
        continue;
      }

      queue.push(value);
    }
  }

  return undefined;
}

/** Handles assert lambda parity safe from zod schema. */
function assertLambdaParitySafeFromZodSchema(zodSchema: ZodType<unknown>): void {
  const unsupportedConstruct = toUnsupportedZodConstruct(zodSchema);
  if (!unsupportedConstruct) {
    return;
  }

  throw new Error(
    `schema.fromZod does not support ${unsupportedConstruct} because generated lambda runtime validation cannot preserve parity.`,
  );
}

export const schemaParityHelpers = {
  assertLambdaParitySafeFromZodSchema,
};
