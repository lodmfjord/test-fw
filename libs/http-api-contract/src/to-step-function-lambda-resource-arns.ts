/**
 * @fileoverview Extracts lambda task resource ARNs from step-function definition JSON.
 */

type JsonRecord = Record<string, unknown>;

/** Checks whether value is object record. */
function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Runs collect task resources. */
function collectTaskResources(value: unknown, found: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectTaskResources(item, found);
    }
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  if (value.Type === "Task" && typeof value.Resource === "string") {
    const resource = value.Resource.trim();
    if (resource.startsWith("arn:aws:lambda:")) {
      found.add(resource);
    }
  }

  for (const entry of Object.values(value)) {
    collectTaskResources(entry, found);
  }
}

/**
 * Converts to step-function lambda resource arns.
 * @param definitionJson - Definition json parameter.
 * @example
 * toStepFunctionLambdaResourceArns(definitionJson)
 * @returns Output value.
 */
export function toStepFunctionLambdaResourceArns(definitionJson: string): string[] {
  const parsedDefinition = JSON.parse(definitionJson) as unknown;
  const found = new Set<string>();

  collectTaskResources(parsedDefinition, found);
  return [...found].sort((left, right) => left.localeCompare(right));
}
