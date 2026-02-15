/**
 * @fileoverview Implements create memory dynamo db.
 */
import type {
  DynamoDbClient,
  DynamoDbItem,
  DynamoDbKey,
  DynamoDbReadInput,
  DynamoDbRemoveInput,
  DynamoDbUpdateInput,
  DynamoDbWriteInput,
} from "./types";

/** Handles normalize key. */
function normalizeKey(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeKey(entry));
  }

  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort((left, right) => left.localeCompare(right))) {
      result[key] = normalizeKey(source[key]);
    }

    return result;
  }

  return value;
}

/** Converts values to storage key. */
function toStorageKey(input: { key: DynamoDbKey; tableName: string }): string {
  return `${input.tableName}:${JSON.stringify(normalizeKey(input.key))}`;
}

/** Handles clone item. */
function cloneItem(item: DynamoDbItem): DynamoDbItem {
  return structuredClone(item);
}

/** Handles read stored item. */
function readStoredItem(
  store: Map<string, DynamoDbItem>,
  input: DynamoDbReadInput | DynamoDbUpdateInput | DynamoDbRemoveInput | DynamoDbWriteInput,
): DynamoDbItem | undefined {
  const value = store.get(toStorageKey(input));
  return value ? cloneItem(value) : undefined;
}

/**
 * Creates memory dynamo db.
 * @example
 * createMemoryDynamoDb()
 */
export function createMemoryDynamoDb(): DynamoDbClient {
  const store = new Map<string, DynamoDbItem>();

  return {
    async read(input) {
      return readStoredItem(store, input);
    },
    async remove(input) {
      store.delete(toStorageKey(input));
    },
    async update(input) {
      const current = readStoredItem(store, input);
      if (!current) {
        return undefined;
      }

      const nextItem = {
        ...current,
        ...input.changes,
        ...input.key,
      };
      store.set(toStorageKey(input), cloneItem(nextItem));
      return cloneItem(nextItem);
    },
    async write(input) {
      const nextItem = {
        ...input.item,
        ...input.key,
      };
      store.set(toStorageKey(input), cloneItem(nextItem));
    },
  };
}
