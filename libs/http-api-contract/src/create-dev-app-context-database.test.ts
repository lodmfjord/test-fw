import { describe, expect, it } from "bun:test";
import { createDynamoDatabase } from "@simple-api/dynamodb";
import { schema } from "@simple-api/schema";
import { createDevApp } from "./create-dev-app";
import { defineEndpoint } from "./define-endpoint";

describe("createDevApp context.database", () => {
  it("binds configured database into endpoint context for writes", async () => {
    const usersDatabase = createDynamoDatabase(
      {
        parse(input: unknown) {
          const item = input as { id?: unknown; name?: unknown };
          if (typeof item.id !== "string" || typeof item.name !== "string") {
            throw new Error("invalid item");
          }

          return {
            id: item.id,
            name: item.name,
          };
        },
      },
      "id",
      {
        tableName: "users",
      },
    );
    const fetch = createDevApp([
      defineEndpoint({
        method: "PATCH",
        path: "/users/:id",
        context: {
          database: {
            access: ["write"],
            handler: usersDatabase,
          },
        },
        handler: async ({ body, database, params }) => {
          const existing = await database.read({
            id: params.id,
          });
          const seeded =
            existing ??
            (await database.write({
              id: params.id,
              name: "seeded",
            }));
          const updated = await database.update(
            {
              id: params.id,
            },
            body,
          );

          return {
            value: updated ?? seeded,
          };
        },
        request: {
          body: schema.object({
            name: schema.optional(schema.string()),
          }),
          params: schema.object({
            id: schema.string(),
          }),
        },
        response: schema.object({
          id: schema.string(),
          name: schema.string(),
        }),
      }),
    ]);

    const response = await fetch(
      new Request("http://local/users/user-1", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "sam",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect((await response.json()) as { id?: string; name?: string }).toEqual({
      id: "user-1",
      name: "sam",
    });
  });

  it("enforces read-only access for context.database", async () => {
    const writes: unknown[] = [];
    const usersDatabase = createDynamoDatabase(
      {
        parse(input: unknown) {
          return input as { id: string; name: string };
        },
      },
      "id",
      {
        tableName: "users",
      },
    );
    const fetch = createDevApp(
      [
        defineEndpoint({
          method: "GET",
          path: "/users/:id",
          context: {
            database: {
              access: ["read"],
              handler: usersDatabase,
            },
          },
          handler: async ({ database, params }) => {
            const readOnlyStore = database as unknown as {
              write(item: { id: string; name: string }): Promise<{ id: string; name: string }>;
            };
            await readOnlyStore.write({
              id: params.id,
              name: "sam",
            });
            return { value: { ok: true } };
          },
          request: {
            params: schema.object({
              id: schema.string(),
            }),
          },
          response: schema.object({
            ok: schema.boolean(),
          }),
        }),
      ],
      {
        db: {
          async read() {
            return undefined;
          },
          async remove() {},
          async update() {
            return undefined;
          },
          async write(input) {
            writes.push(input);
          },
        },
      },
    );

    const response = await fetch(new Request("http://local/users/user-1", { method: "GET" }));

    expect(response.status).toBe(500);
    expect(writes).toHaveLength(0);
  });
});
