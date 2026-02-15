/** @fileoverview Implements to dynamodb tables. @module libs/http-api-contract/src/to-dynamodb-tables */
import type { EndpointRuntimeDefinition } from "./types";

/** Converts values to table key. */
function toTableKey(tableName: string): string {
  return tableName.replace(/[^a-zA-Z0-9_]/g, "_");
}

/** Converts values to dynamodb tables. @example `toDynamodbTables(input)` */
export function toDynamodbTables(
  endpoints: ReadonlyArray<EndpointRuntimeDefinition>,
): Record<string, Record<string, string>> {
  const tableNames = new Map<string, string>();

  for (const endpoint of endpoints) {
    const runtime = endpoint.context?.database?.runtime;
    if (!runtime) {
      continue;
    }

    const existing = tableNames.get(runtime.tableName);
    if (existing && existing !== runtime.keyField) {
      throw new Error(
        `Conflicting keyField for DynamoDB table "${runtime.tableName}": "${existing}" vs "${runtime.keyField}"`,
      );
    }

    tableNames.set(runtime.tableName, runtime.keyField);
  }

  const entries = [...tableNames.entries()].sort(([left], [right]) => left.localeCompare(right));
  const result: Record<string, Record<string, string>> = {};
  for (const [tableName, keyField] of entries) {
    result[toTableKey(tableName)] = {
      hash_key: keyField,
      name: tableName,
    };
  }

  return result;
}
