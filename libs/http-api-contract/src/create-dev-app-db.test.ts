/**
 * @fileoverview Tests create-dev-app database behavior.
 */
import { describe, expect, it } from "bun:test";
import { schema } from "@babbstack/schema";
import { createDevApp } from "./create-dev-app";
import { defineEndpoint } from "./define-endpoint";

describe("createDevApp database behavior", () => {
  it("injects db into endpoint context", async () => {
    const fetch = createDevApp([
      defineEndpoint({
        method: "POST",
        path: "/users",
        handler: async ({ body, db }) => {
          const id = `user-${body.name}`;
          await db.write({
            item: {
              name: body.name,
            },
            key: {
              id,
            },
            tableName: "users",
          });

          const item = await db.read({
            key: {
              id,
            },
            tableName: "users",
          });

          return {
            value: {
              id: String(item?.id ?? ""),
            },
          };
        },
        request: {
          body: schema.object({
            name: schema.string(),
          }),
        },
        response: schema.object({
          id: schema.string(),
        }),
      }),
    ]);

    const response = await fetch(
      new Request("http://local/users", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ name: "sam" }),
      }),
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { id?: string };
    expect(payload.id).toBe("user-sam");
  });

  it("uses provided db instance in endpoint context", async () => {
    const reads: unknown[] = [];
    const writes: unknown[] = [];
    const fetch = createDevApp(
      [
        defineEndpoint({
          method: "POST",
          path: "/users",
          handler: async ({ db }) => {
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

            return {
              value: {
                id: String(item?.id ?? ""),
                name: String(item?.name ?? ""),
              },
            };
          },
          response: schema.object({
            id: schema.string(),
            name: schema.string(),
          }),
        }),
      ],
      {
        db: {
          async read(input) {
            reads.push(input);
            return {
              id: "user-1",
              name: "sam",
            };
          },
          async remove() {},
          async update() {
            return {
              id: "user-1",
              name: "sam",
            };
          },
          async write(input) {
            writes.push(input);
          },
        },
      },
    );

    const response = await fetch(new Request("http://local/users", { method: "POST" }));

    expect(response.status).toBe(200);
    expect(reads).toHaveLength(1);
    expect(writes).toHaveLength(1);
  });

  it("rejects db writes for endpoints with read-only db access", async () => {
    const writes: unknown[] = [];
    const fetch = createDevApp(
      [
        defineEndpoint({
          access: {
            db: "read",
          },
          method: "GET",
          path: "/users",
          handler: async ({ db }) => {
            const writer = db as unknown as {
              write(input: unknown): Promise<void>;
            };
            await writer.write({
              item: {
                name: "sam",
              },
              key: {
                id: "user-1",
              },
              tableName: "users",
            });

            return {
              value: {
                ok: true,
              },
            };
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

    const response = await fetch(new Request("http://local/users", { method: "GET" }));

    expect(response.status).toBe(500);
    expect(writes).toHaveLength(0);
  });
});
