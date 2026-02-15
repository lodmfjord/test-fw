/**
 * @fileoverview Implements index.
 */
export { createAwsDynamoDb } from "./create-aws-dynamo-db";
export { createDynamoDatabase } from "./create-dynamo-database";
export { createMemoryDynamoDb } from "./create-memory-dynamo-db";
export { createRuntimeDynamoDb } from "./create-runtime-dynamo-db";
export { createTypedDynamoDb } from "./create-typed-dynamo-db";
export { defineDynamoDbTable } from "./define-dynamo-db-table";
export type {
  AwsDynamoDbOperations,
  CreateAwsDynamoDbInput,
  CreateRuntimeDynamoDbInput,
  DynamoDbClient,
  DynamoDbItem,
  DynamoDbKey,
  DynamoDbRemoveInput,
  DynamoDbReadInput,
  DynamoDbTableDefinition,
  DynamoDbUpdateInput,
  DynamoDbWriteInput,
  TypedDynamoDbClient,
  TypedDynamoDbTableClient,
} from "./types";
export type {
  DynamoDatabase,
  DynamoDatabaseRuntimeConfig,
  ReadBoundDynamoDatabase,
  WriteBoundDynamoDatabase,
} from "./create-dynamo-database";
