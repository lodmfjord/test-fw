import { describe, expect, it } from "bun:test";
import { createDynamoDatabase } from "@simple-api/dynamodb";
import { defineEndpoint } from "./define-endpoint";
import { schema } from "@simple-api/schema";

describe("defineEndpoint", () => {
  it("creates endpoint metadata with request and response schemas", () => {
    const endpoint = defineEndpoint({
      method: "post",
      path: "/users/:id",
      handler: ({ body }) => ({ value: { id: body.name } }),
      request: {
        body: schema.object({
          name: schema.string(),
        }),
      },
      response: schema.object({
        id: schema.string(),
      }),
    });

    expect(endpoint.method).toBe("POST");
    expect(endpoint.path).toBe("/users/{id}");
    expect(endpoint.routeId).toBe("post_users_param_id");
    expect(endpoint.handlerId).toBe("post_users_param_id_handler");
    expect(endpoint.request.body?.jsonSchema.type).toBe("object");
    expect(endpoint.response.jsonSchema.type).toBe("object");
  });

  it("stores endpoint db access metadata", () => {
    const endpoint = defineEndpoint({
      access: {
        db: "read",
      },
      method: "GET",
      path: "/users/:id",
      handler: ({ params }) => ({ value: { id: params.id } }),
      request: {
        params: schema.object({
          id: schema.string(),
        }),
      },
      response: schema.object({
        id: schema.string(),
      }),
    });

    expect(endpoint.access?.db).toBe("read");
  });

  it("stores endpoint context database metadata", () => {
    const usersDatabase = createDynamoDatabase(
      {
        parse(input: unknown) {
          return input as {
            id: string;
            name: string;
          };
        },
      },
      "id",
      {
        tableName: "users",
      },
    );
    const endpoint = defineEndpoint({
      method: "GET",
      path: "/users/:id",
      context: {
        database: {
          access: ["read"],
          handler: usersDatabase,
        },
      },
      handler: async ({ database, params }) => {
        const item = await database.read({
          id: params.id,
        });
        return {
          value: item ?? { id: params.id, name: "unknown" },
        };
      },
      request: {
        params: schema.object({
          id: schema.string(),
        }),
      },
      response: schema.object({
        id: schema.string(),
        name: schema.string(),
      }),
    });

    expect(endpoint.context?.database).toEqual({
      access: ["read"],
      runtime: {
        keyField: "id",
        kind: "dynamo-database",
        tableName: "users",
      },
    });
  });
});
