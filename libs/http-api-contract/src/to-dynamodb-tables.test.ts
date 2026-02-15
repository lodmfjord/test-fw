/**
 * @fileoverview Tests toDynamodbTables behavior.
 */
import { describe, expect, it } from "bun:test";
import { toDynamodbTables } from "./to-dynamodb-tables";

describe("toDynamodbTables", () => {
  it("maps table runtime metadata with sanitized keys", () => {
    const tables = toDynamodbTables([
      {
        context: {
          database: {
            runtime: {
              keyField: "id",
              tableName: "users-table",
            },
          },
        },
      } as never,
    ]);

    expect(tables).toEqual({
      users_table: {
        hash_key: "id",
        name: "users-table",
      },
    });
  });

  it("throws when key fields conflict for the same table", () => {
    expect(() =>
      toDynamodbTables([
        {
          context: {
            database: {
              runtime: {
                keyField: "id",
                tableName: "users",
              },
            },
          },
        } as never,
        {
          context: {
            database: {
              runtime: {
                keyField: "userId",
                tableName: "users",
              },
            },
          },
        } as never,
      ]),
    ).toThrow('Conflicting keyField for DynamoDB table "users": "id" vs "userId"');
  });
});
