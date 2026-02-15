/**
 * @fileoverview Implements types.
 */
export type DynamoDbKey = Record<string, unknown>;

export type DynamoDbItem = Record<string, unknown>;

export type DynamoDbReadInput = {
  key: DynamoDbKey;
  tableName: string;
};

export type DynamoDbWriteInput = {
  item: DynamoDbItem;
  key: DynamoDbKey;
  tableName: string;
};

export type DynamoDbUpdateInput = {
  changes: DynamoDbItem;
  key: DynamoDbKey;
  tableName: string;
};

export type DynamoDbRemoveInput = {
  key: DynamoDbKey;
  tableName: string;
};

export type DynamoDbClient = {
  read(input: DynamoDbReadInput): Promise<DynamoDbItem | undefined>;
  remove(input: DynamoDbRemoveInput): Promise<void>;
  update(input: DynamoDbUpdateInput): Promise<DynamoDbItem | undefined>;
  write(input: DynamoDbWriteInput): Promise<void>;
};

export type AwsDynamoDbOperations = {
  readItem(input: DynamoDbReadInput): Promise<DynamoDbItem | undefined>;
  removeItem(input: DynamoDbRemoveInput): Promise<void>;
  updateItem(input: DynamoDbUpdateInput): Promise<DynamoDbItem | undefined>;
  writeItem(input: { item: DynamoDbItem; tableName: string }): Promise<void>;
};

export type CreateAwsDynamoDbInput = {
  operations?: AwsDynamoDbOperations;
};

export type CreateRuntimeDynamoDbInput = {
  createAwsDb?: () => Promise<DynamoDbClient> | DynamoDbClient;
  createMemoryDb?: () => DynamoDbClient;
  isLambdaRuntime?: boolean;
};

export type DynamoDbTableDefinition<
  TItem extends DynamoDbItem,
  TKeyField extends keyof TItem & string,
> = {
  keyFields: ReadonlyArray<TKeyField>;
  tableName: string;
};

export type TypedDynamoDbTableClient<
  TItem extends DynamoDbItem,
  TKeyField extends keyof TItem & string,
> = {
  get(key: Pick<TItem, TKeyField>): Promise<TItem | undefined>;
  insert(item: TItem): Promise<TItem>;
  remove(key: Pick<TItem, TKeyField>): Promise<void>;
  update(
    key: Pick<TItem, TKeyField>,
    changes: Partial<Omit<TItem, TKeyField>>,
  ): Promise<TItem | undefined>;
};

export type TypedDynamoDbClient<
  TTables extends Record<string, DynamoDbTableDefinition<DynamoDbItem, string>>,
> = {
  [TName in keyof TTables]: TTables[TName] extends DynamoDbTableDefinition<
    infer TItem,
    infer TKeyField
  >
    ? TypedDynamoDbTableClient<TItem, TKeyField>
    : never;
};
