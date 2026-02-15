/**
 * @fileoverview Implements create dynamo database.
 */
import type { DynamoDbClient, DynamoDbItem } from "./types";

type Parser<TItem extends DynamoDbItem> = {
  parse(input: unknown): TItem;
};

type CreateDynamoDatabaseOptions = {
  tableName?: string;
};

type DynamoDatabaseReadClient = Pick<DynamoDbClient, "read">;

type DynamoDatabaseWriteClient = DynamoDbClient;

export type DynamoDatabaseRuntimeConfig<TKeyField extends string = string> = {
  keyField: TKeyField;
  kind: "dynamo-database";
  tableName: string;
};

export type ReadBoundDynamoDatabase<
  TItem extends DynamoDbItem,
  TKeyField extends keyof TItem & string,
> = {
  read(key: Pick<TItem, TKeyField>): Promise<TItem | undefined>;
};

export type WriteBoundDynamoDatabase<
  TItem extends DynamoDbItem,
  TKeyField extends keyof TItem & string,
> = {
  read(key: Pick<TItem, TKeyField>): Promise<TItem | undefined>;
  remove(key: Pick<TItem, TKeyField>): Promise<void>;
  update(
    key: Pick<TItem, TKeyField>,
    changes: Partial<Omit<TItem, TKeyField>>,
  ): Promise<TItem | undefined>;
  write(item: TItem): Promise<TItem>;
};

export type DynamoDatabase<TItem extends DynamoDbItem, TKeyField extends keyof TItem & string> = {
  bind(db: DynamoDatabaseWriteClient): WriteBoundDynamoDatabase<TItem, TKeyField>;
  bind(db: DynamoDatabaseReadClient): ReadBoundDynamoDatabase<TItem, TKeyField>;
  keyField: TKeyField;
  parse(input: unknown): TItem;
  read(db: DynamoDatabaseReadClient, key: Pick<TItem, TKeyField>): Promise<TItem | undefined>;
  remove(db: DynamoDatabaseWriteClient, key: Pick<TItem, TKeyField>): Promise<void>;
  runtimeConfig: DynamoDatabaseRuntimeConfig<TKeyField>;
  tableName: string;
  update(
    db: DynamoDatabaseWriteClient,
    key: Pick<TItem, TKeyField>,
    changes: Partial<Omit<TItem, TKeyField>>,
  ): Promise<TItem | undefined>;
  write(db: DynamoDatabaseWriteClient, item: TItem): Promise<TItem>;
};

/** Converts to table name. */ function toTableName<TKeyField extends string>(
  keyField: TKeyField,
  options: CreateDynamoDatabaseOptions | undefined,
): string {
  const source = options?.tableName ?? keyField;
  const tableName = source.trim();
  if (tableName.length === 0) {
    throw new Error("tableName is required");
  }

  return tableName;
}

/** Converts to item key. */ function toItemKey<
  TItem extends DynamoDbItem,
  TKeyField extends keyof TItem & string,
>(item: TItem, keyField: TKeyField): Pick<TItem, TKeyField> {
  return {
    [keyField]: item[keyField],
  } as Pick<TItem, TKeyField>;
}

/** Converts to record. */
function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value as Record<string, unknown>;
}

/**
 * Creates dynamo database.
 * @param parser - Parser parameter.
 * @param keyField - Key field parameter.
 * @param options - Options parameter.
 * @example
 * createDynamoDatabase(parser, keyField, options)
 * @returns Output value.
 */ export function createDynamoDatabase<
  TItem extends DynamoDbItem,
  TKeyField extends keyof TItem & string,
>(
  parser: Parser<TItem>,
  keyField: TKeyField,
  options?: CreateDynamoDatabaseOptions,
): DynamoDatabase<TItem, TKeyField> {
  const tableName = toTableName(keyField, options);

  /** Runs read. */ const read = async (
    db: DynamoDatabaseReadClient,
    key: Pick<TItem, TKeyField>,
  ): Promise<TItem | undefined> => {
    const item = await db.read({
      key: toRecord(key),
      tableName,
    });
    return item ? parser.parse(item) : undefined;
  };

  /** Runs write. */ const write = async (
    db: DynamoDatabaseWriteClient,
    item: TItem,
  ): Promise<TItem> => {
    const parsedItem = parser.parse(item);
    await db.write({
      item: toRecord(parsedItem),
      key: toRecord(toItemKey(parsedItem, keyField)),
      tableName,
    });
    return parsedItem;
  };

  /** Runs update. */ const update = async (
    db: DynamoDatabaseWriteClient,
    key: Pick<TItem, TKeyField>,
    changes: Partial<Omit<TItem, TKeyField>>,
  ): Promise<TItem | undefined> => {
    const item = await db.update({
      changes: toRecord(changes),
      key: toRecord(key),
      tableName,
    });
    return item ? parser.parse(item) : undefined;
  };

  /** Runs remove. */ const remove = async (
    db: DynamoDatabaseWriteClient,
    key: Pick<TItem, TKeyField>,
  ): Promise<void> => {
    await db.remove({
      key: toRecord(key),
      tableName,
    });
  };

  /** Handles bind. */
  function bind(db: DynamoDatabaseWriteClient): WriteBoundDynamoDatabase<TItem, TKeyField>;
  /** Handles bind. */
  function bind(db: DynamoDatabaseReadClient): ReadBoundDynamoDatabase<TItem, TKeyField>;
  /** Runs bind. */
  function bind(
    db: DynamoDatabaseReadClient | DynamoDatabaseWriteClient,
  ): ReadBoundDynamoDatabase<TItem, TKeyField> | WriteBoundDynamoDatabase<TItem, TKeyField> {
    if ("write" in db && "update" in db && "remove" in db) {
      return {
        read: (key: Pick<TItem, TKeyField>) => read(db, key),
        remove: (key: Pick<TItem, TKeyField>) => remove(db, key),
        update: (key: Pick<TItem, TKeyField>, changes: Partial<Omit<TItem, TKeyField>>) =>
          update(db, key, changes),
        write: (item: TItem) => write(db, item),
      };
    }

    return {
      read: (key: Pick<TItem, TKeyField>) => read(db, key),
    };
  }

  return {
    bind,
    keyField,
    parse(input) {
      return parser.parse(input);
    },
    read,
    remove,
    runtimeConfig: {
      keyField,
      kind: "dynamo-database",
      tableName,
    },
    tableName,
    update,
    write,
  };
}
