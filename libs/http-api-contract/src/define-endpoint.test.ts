/** @fileoverview Tests define endpoint. @module libs/http-api-contract/src/define-endpoint.test */
import { describe, expect, it } from "bun:test";
import { createDynamoDatabase } from "@babbstack/dynamodb";
import { defineEndpoint } from "./define-endpoint";
import { schema } from "@babbstack/schema";

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

  it("rejects handlers for step-function endpoints", () => {
    expect(() =>
      defineEndpoint({
        execution: {
          definition:
            '{"StartAt":"Done","States":{"Done":{"Type":"Pass","Result":{"ok":true},"End":true}}}',
          kind: "step-function",
          stateMachineName: "demo",
        },
        method: "POST",
        path: "/step-function",
        handler: () => ({
          value: {
            ok: true,
          },
        }),
        response: schema.object({
          ok: schema.boolean(),
        }),
      }),
    ).toThrow("Step-function routes must not define handlers");
  });

  it("rejects lambda endpoints without handlers", () => {
    expect(() =>
      defineEndpoint({
        method: "GET",
        path: "/health",
        response: schema.object({
          ok: schema.boolean(),
        }),
      }),
    ).toThrow("Lambda routes must define handlers");
  });

  it("stores explicit successStatusCode metadata", () => {
    const endpoint = defineEndpoint({
      method: "POST",
      path: "/users",
      handler: ({ body }) => ({ value: { id: body.name } }),
      request: {
        body: schema.object({
          name: schema.string(),
        }),
      },
      response: schema.object({
        id: schema.string(),
      }),
      successStatusCode: 201,
    });

    expect(endpoint.successStatusCode).toBe(201);
  });

  it("rejects non-2xx successStatusCode", () => {
    expect(() =>
      defineEndpoint({
        method: "POST",
        path: "/users",
        handler: ({ body }) => ({ value: { id: body.name } }),
        request: {
          body: schema.object({
            name: schema.string(),
          }),
        },
        response: schema.object({
          id: schema.string(),
        }),
        successStatusCode: 199,
      }),
    ).toThrow("successStatusCode must be an integer between 200 and 299");
  });

  it("stores additional response schemas by status code", () => {
    const endpoint = defineEndpoint({
      method: "GET",
      path: "/users/{id}",
      handler: ({ params }) => ({
        statusCode: 404,
        value: { error: `User ${params.id} not found` },
      }),
      request: {
        params: schema.object({
          id: schema.string(),
        }),
      },
      response: schema.object({
        id: schema.string(),
      }),
      responses: {
        404: schema.object({
          error: schema.string(),
        }),
      },
    });

    expect(endpoint.responseByStatusCode["200"]?.jsonSchema.type).toBe("object");
    expect(endpoint.responseByStatusCode["404"]?.jsonSchema.type).toBe("object");
  });
});
