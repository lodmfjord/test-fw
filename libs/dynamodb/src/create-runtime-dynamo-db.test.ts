import { describe, expect, it } from "bun:test";
import type { DynamoDbClient } from "./types";
import { createRuntimeDynamoDb } from "./create-runtime-dynamo-db";

function createNamedDb(name: string): DynamoDbClient {
  return {
    async read() {
      return { source: name };
    },
    async remove() {
      return undefined;
    },
    async update() {
      return { source: `${name}-updated` };
    },
    async write() {
      return undefined;
    },
  };
}

describe("createRuntimeDynamoDb", () => {
  it("uses memory db when not in lambda", async () => {
    const db = createRuntimeDynamoDb({
      createAwsDb: async () => createNamedDb("aws"),
      createMemoryDb: () => createNamedDb("memory"),
      isLambdaRuntime: false,
    });

    const item = await db.read({
      key: { id: "1" },
      tableName: "users",
    });
    expect(item?.source).toBe("memory");
  });

  it("uses aws db when in lambda", async () => {
    const db = createRuntimeDynamoDb({
      createAwsDb: async () => createNamedDb("aws"),
      createMemoryDb: () => createNamedDb("memory"),
      isLambdaRuntime: true,
    });

    const item = await db.read({
      key: { id: "1" },
      tableName: "users",
    });
    expect(item?.source).toBe("aws");
  });

  it("proxies update and remove methods", async () => {
    const db = createRuntimeDynamoDb({
      createMemoryDb: () => createNamedDb("memory"),
      isLambdaRuntime: false,
    });

    const updated = await db.update({
      changes: { name: "max" },
      key: { id: "1" },
      tableName: "users",
    });
    await db.remove({
      key: { id: "1" },
      tableName: "users",
    });

    expect(updated?.source).toBe("memory-updated");
  });
});
