/**
 * @fileoverview Tests create typed dynamo db.
 */
import { describe, expect, it } from "bun:test";
import { createMemoryDynamoDb } from "./create-memory-dynamo-db";
import { createTypedDynamoDb } from "./create-typed-dynamo-db";
import { defineDynamoDbTable } from "./define-dynamo-db-table";

type UserItem = {
  id: string;
  name: string;
  role: "admin" | "user";
};

describe("createTypedDynamoDb", () => {
  it("supports typed get, insert, update, and remove", async () => {
    const usersTable = defineDynamoDbTable<UserItem, "id">({
      keyFields: ["id"],
      tableName: "users",
    });
    const db = createTypedDynamoDb(createMemoryDynamoDb(), {
      users: usersTable,
    });

    const inserted = await db.users.insert({
      id: "user-1",
      name: "sam",
      role: "user",
    });
    const fetched = await db.users.get({ id: "user-1" });
    const updated = await db.users.update(
      { id: "user-1" },
      {
        name: "max",
      },
    );
    await db.users.remove({ id: "user-1" });
    const afterRemoval = await db.users.get({ id: "user-1" });

    expect(inserted).toEqual({
      id: "user-1",
      name: "sam",
      role: "user",
    });
    expect(fetched).toEqual({
      id: "user-1",
      name: "sam",
      role: "user",
    });
    expect(updated).toEqual({
      id: "user-1",
      name: "max",
      role: "user",
    });
    expect(afterRemoval).toBeUndefined();
  });

  it("is type-safe for key, item, and updates", async () => {
    const usersTable = defineDynamoDbTable<UserItem, "id">({
      keyFields: ["id"],
      tableName: "users",
    });
    const db = createTypedDynamoDb(createMemoryDynamoDb(), {
      users: usersTable,
    });

    const fetched = db.users.get({ id: "user-1" });
    const inserted = db.users.insert({
      id: "user-2",
      name: "john",
      role: "admin",
    });
    const updated = db.users.update(
      { id: "user-2" },
      {
        name: "doe",
      },
    );

    const _typedFetched: Promise<UserItem | undefined> = fetched;
    const _typedInserted: Promise<UserItem> = inserted;
    const _typedUpdated: Promise<UserItem | undefined> = updated;

    await Promise.all([_typedFetched, _typedInserted, _typedUpdated]);
    expect(true).toBe(true);
  });
});
