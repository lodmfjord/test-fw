/**
 * @fileoverview Implements test databases.
 */
import { createTypedDynamoDb, defineDynamoDbTable, type DynamoDbClient } from "@babbstack/dynamodb";

type TestDbOneItem = {
  id: string;
  name: string;
  points: number;
};

type TestDbTwoItem = {
  enabled: boolean;
  id: string;
  title: string;
};

const testDbOneTable = defineDynamoDbTable<TestDbOneItem, "id">({
  keyFields: ["id"],
  tableName: "test-db-one",
});

const testDbTwoTable = defineDynamoDbTable<TestDbTwoItem, "id">({
  keyFields: ["id"],
  tableName: "test-db-two",
});

/**
 * Creates test databases.
 * @param db - Db parameter.
 * @example
 * createTestDatabases(db)
 */ export function createTestDatabases(db: DynamoDbClient) {
  return createTypedDynamoDb(db, {
    testDbOne: testDbOneTable,
    testDbTwo: testDbTwoTable,
  });
}
