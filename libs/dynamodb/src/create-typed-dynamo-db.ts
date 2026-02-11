import type {
  DynamoDbClient,
  DynamoDbItem,
  DynamoDbTableDefinition,
  TypedDynamoDbClient,
} from "./types";

function toKeyFromItem<TItem extends DynamoDbItem, TKeyField extends keyof TItem & string>(
  item: TItem,
  keyFields: ReadonlyArray<TKeyField>,
): Pick<TItem, TKeyField> {
  const key: Partial<Pick<TItem, TKeyField>> = {};

  for (const keyField of keyFields) {
    key[keyField] = item[keyField];
  }

  return key as Pick<TItem, TKeyField>;
}

export function createTypedDynamoDb<
  TTables extends Record<string, DynamoDbTableDefinition<DynamoDbItem, string>>,
>(db: DynamoDbClient, tables: TTables): TypedDynamoDbClient<TTables> {
  const tableClients: Partial<Record<keyof TTables, unknown>> = {};

  for (const [name, tableDefinition] of Object.entries(tables) as Array<
    [keyof TTables, TTables[keyof TTables]]
  >) {
    tableClients[name] = {
      async get(key: DynamoDbItem): Promise<DynamoDbItem | undefined> {
        const item = await db.read({
          key,
          tableName: tableDefinition.tableName,
        });
        return item;
      },
      async insert(item: DynamoDbItem): Promise<DynamoDbItem> {
        const key = toKeyFromItem(item, tableDefinition.keyFields);
        await db.write({
          item,
          key,
          tableName: tableDefinition.tableName,
        });
        return item;
      },
      async remove(key: DynamoDbItem): Promise<void> {
        await db.remove({
          key,
          tableName: tableDefinition.tableName,
        });
      },
      async update(key: DynamoDbItem, changes: DynamoDbItem): Promise<DynamoDbItem | undefined> {
        return db.update({
          changes,
          key,
          tableName: tableDefinition.tableName,
        });
      },
    };
  }

  return tableClients as TypedDynamoDbClient<TTables>;
}
