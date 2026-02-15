/**
 * @fileoverview Tests create memory dynamo db.
 */
import { describe, expect, it } from "bun:test";
import { createMemoryDynamoDb } from "./create-memory-dynamo-db";

describe("createMemoryDynamoDb", () => {
  it("writes and reads items by table and key", async () => {
    const db = createMemoryDynamoDb();

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

    expect(item).toEqual({
      id: "user-1",
      name: "sam",
    });
  });

  it("returns undefined when key does not exist", async () => {
    const db = createMemoryDynamoDb();

    const item = await db.read({
      key: {
        id: "missing-user",
      },
      tableName: "users",
    });

    expect(item).toBeUndefined();
  });

  it("updates and removes items", async () => {
    const db = createMemoryDynamoDb();

    await db.write({
      item: {
        name: "sam",
      },
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

    expect(updated).toEqual({
      id: "user-1",
      name: "max",
    });

    await db.remove({
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
    expect(item).toBeUndefined();
  });
});
