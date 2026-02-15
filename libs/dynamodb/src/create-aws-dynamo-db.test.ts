/** @fileoverview Tests create aws dynamo db. @module libs/dynamodb/src/create-aws-dynamo-db.test */
import { describe, expect, it } from "bun:test";
import { createAwsDynamoDb } from "./create-aws-dynamo-db";

describe("createAwsDynamoDb", () => {
  it("delegates read and write operations to the aws adapter", async () => {
    const reads: unknown[] = [];
    const writes: unknown[] = [];
    const updates: unknown[] = [];
    const removals: unknown[] = [];
    const db = createAwsDynamoDb({
      operations: {
        async readItem(input) {
          reads.push(input);
          return {
            id: "user-1",
            name: "sam",
          };
        },
        async writeItem(input) {
          writes.push(input);
        },
        async updateItem(input) {
          updates.push(input);
          return {
            id: "user-1",
            name: "max",
          };
        },
        async removeItem(input) {
          removals.push(input);
        },
      },
    });

    await db.write({
      item: {
        name: "sam",
      },
      key: {
        id: "user-1",
      },
      tableName: "users",
    });

    const item = await db.read({
      key: {
        id: "user-1",
      },
      tableName: "users",
    });
    const updated = await db.update({
      changes: {
        name: "max",
      },
      key: {
        id: "user-1",
      },
      tableName: "users",
    });
    await db.remove({
      key: {
        id: "user-1",
      },
      tableName: "users",
    });

    expect(item).toEqual({
      id: "user-1",
      name: "sam",
    });
    expect(updated).toEqual({
      id: "user-1",
      name: "max",
    });
    expect(writes).toEqual([
      {
        item: {
          id: "user-1",
          name: "sam",
        },
        tableName: "users",
      },
    ]);
    expect(reads).toEqual([
      {
        key: {
          id: "user-1",
        },
        tableName: "users",
      },
    ]);
    expect(updates).toEqual([
      {
        changes: {
          name: "max",
        },
        key: {
          id: "user-1",
        },
        tableName: "users",
      },
    ]);
    expect(removals).toEqual([
      {
        key: {
          id: "user-1",
        },
        tableName: "users",
      },
    ]);
  });
});
