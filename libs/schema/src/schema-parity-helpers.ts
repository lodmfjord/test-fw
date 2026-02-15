/**
 * @fileoverview Implements parity helpers for schema.fromZod.
 */
import type { ZodType } from "zod";

/** Checks whether record. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Handles append values to queue. */
function appendValuesToQueue(queue: unknown[], source: Record<string, unknown>): void {
  for (const value of Object.values(source)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        queue.push(item);
      }
      continue;
    }

    queue.push(value);
  }
}

/** Converts values to zod definition. */
function toZodDefinition(node: Record<string, unknown>): Record<string, unknown> | undefined {
  if (isRecord(node._def)) {
    return node._def;
  }

  if (isRecord(node.def)) {
    return node.def;
  }

  return undefined;
}

/** Converts values to unsupported construct from type. */
function toUnsupportedConstructFromType(definitionType: unknown): string | undefined {
  if (definitionType === "pipe" || definitionType === "transform") {
    return "transforms/preprocess operations";
  }

  return undefined;
}

/** Converts values to unsupported construct from checks. */
function toUnsupportedConstructFromChecks(checks: unknown[], queue: unknown[]): string | undefined {
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

  return undefined;
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

    const definition = toZodDefinition(next);
    if (!definition) {
      appendValuesToQueue(queue, next);
      continue;
    }

    const unsupportedConstructFromType = toUnsupportedConstructFromType(definition.type);
    if (unsupportedConstructFromType) {
      return unsupportedConstructFromType;
    }

    const checks = Array.isArray(definition.checks) ? definition.checks : [];
    const unsupportedConstructFromChecks = toUnsupportedConstructFromChecks(checks, queue);
    if (unsupportedConstructFromChecks) {
      return unsupportedConstructFromChecks;
    }

    appendValuesToQueue(queue, definition);
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
