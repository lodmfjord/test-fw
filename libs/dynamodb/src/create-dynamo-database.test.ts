/**
 * @fileoverview Tests create dynamo database.
 */
import { describe, expect, it } from "bun:test";
import { createMemoryDynamoDb } from "./create-memory-dynamo-db";
import { createDynamoDatabase } from "./create-dynamo-database";

type PointItem = {
  id: string;
  points: number;
};

/** Runs point definition. */
function pointDefinition() {
  return {
    parse(input: unknown): PointItem {
      if (!input || typeof input !== "object") {
        throw new Error("expected object");
      }

      const source = input as Record<string, unknown>;
      if (typeof source.id !== "string") {
        throw new Error("id must be string");
      }

      if (typeof source.points !== "number") {
        throw new Error("points must be number");
      }

      return {
        id: source.id,
        points: source.points,
      };
    },
  };
}

describe("createDynamoDatabase", () => {
  it("supports read, write, update, and remove operations", async () => {
    const db = createMemoryDynamoDb();
    const pointDatabase = createDynamoDatabase(pointDefinition(), "id", {
      tableName: "points",
    });
    const pointStore = pointDatabase.bind(db);

    await pointStore.write({
      id: "point-1",
      points: 1,
    });
    const firstRead = await pointStore.read({
      id: "point-1",
    });
    const updated = await pointStore.update(
      {
        id: "point-1",
      },
      {
        points: 2,
      },
    );
    await pointStore.remove({
      id: "point-1",
    });
    const secondRead = await pointStore.read({
      id: "point-1",
    });

    expect(firstRead).toEqual({
      id: "point-1",
      points: 1,
    });
    expect(updated).toEqual({
      id: "point-1",
      points: 2,
    });
    expect(secondRead).toBeUndefined();
  });

  it("supports read-only binding for read-only clients", async () => {
    const db = createMemoryDynamoDb();
    const pointDatabase = createDynamoDatabase(pointDefinition(), "id", {
      tableName: "points",
    });
    const writeStore = pointDatabase.bind(db);
    await writeStore.write({
      id: "point-1",
      points: 1,
    });

    const readStore = pointDatabase.bind({
      read: db.read,
    });
    const point = await readStore.read({
      id: "point-1",
    });

    expect(point).toEqual({
      id: "point-1",
      points: 1,
    });
    expect("write" in readStore).toBe(false);
    expect("update" in readStore).toBe(false);
    expect("remove" in readStore).toBe(false);
  });
});
