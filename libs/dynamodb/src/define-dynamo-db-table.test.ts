/**
 * @fileoverview Tests defineDynamoDbTable behavior.
 */
import { describe, expect, it } from "bun:test";
import { defineDynamoDbTable } from "./define-dynamo-db-table";

describe("defineDynamoDbTable", () => {
  it("normalizes table definitions", () => {
    const table = defineDynamoDbTable<{ id: string; name: string }, "id">({
      keyFields: ["id"],
      tableName: " users ",
    });

    expect(table).toEqual({
      keyFields: ["id"],
      tableName: "users",
    });
  });

  it("rejects empty table names and key fields", () => {
    expect(() =>
      defineDynamoDbTable<{ id: string }, "id">({
        keyFields: ["id"],
        tableName: " ",
      }),
    ).toThrow("tableName is required");

    expect(() =>
      defineDynamoDbTable<{ id: string }, "id">({
        keyFields: [],
        tableName: "users",
      }),
    ).toThrow("keyFields must include at least one field");
  });
});
