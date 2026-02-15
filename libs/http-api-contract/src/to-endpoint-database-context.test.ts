/**
 * @fileoverview Tests toEndpointDatabaseContext behavior.
 */
import { describe, expect, it } from "bun:test";
import { toEndpointDatabaseContext } from "./to-endpoint-database-context";

describe("toEndpointDatabaseContext", () => {
  it("returns read-only db binding when endpoint access is read", () => {
    const db = {
      read: async () => undefined,
      remove: async () => undefined,
      update: async () => undefined,
      write: async () => undefined,
    };

    const context = toEndpointDatabaseContext(
      db as never,
      {
        access: {
          db: "read",
        },
        context: {
          database: {
            access: ["read"],
            runtime: {
              keyField: "id",
              tableName: "users",
            },
          },
        },
      } as never,
    );

    expect(typeof (context.db as { read: unknown }).read).toBe("function");
    expect((context.db as { write?: unknown }).write).toBeUndefined();
    expect(context.database).toBeDefined();
  });
});
