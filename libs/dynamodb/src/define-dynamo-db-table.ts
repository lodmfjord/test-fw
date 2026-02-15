/**
 * @fileoverview Implements define dynamo db table.
 */
import type { DynamoDbItem, DynamoDbTableDefinition } from "./types";

type DefineDynamoDbTableInput<
  TItem extends DynamoDbItem,
  TKeyField extends keyof TItem & string,
> = {
  keyFields: ReadonlyArray<TKeyField>;
  tableName: string;
};

/**
 * Defines dynamo db table.
 * @param input - Input parameter.
 * @example
 * defineDynamoDbTable(input)
 * @returns Output value.
 * @throws Error when operation fails.
 */ export function defineDynamoDbTable<
  TItem extends DynamoDbItem,
  TKeyField extends keyof TItem & string,
>(input: DefineDynamoDbTableInput<TItem, TKeyField>): DynamoDbTableDefinition<TItem, TKeyField> {
  const tableName = input.tableName.trim();
  if (tableName.length === 0) {
    throw new Error("tableName is required");
  }

  if (input.keyFields.length === 0) {
    throw new Error("keyFields must include at least one field");
  }

  return {
    keyFields: [...input.keyFields],
    tableName,
  };
}
