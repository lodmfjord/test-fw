import { describe, expect, it } from "bun:test";
import { createDevApp } from "./create-dev-app";
import { defineEndpoint } from "./define-endpoint";
import { schema } from "@babbstack/schema";

describe("createDevApp response schema by status code", () => {
  it("validates output using matching status response schema", async () => {
    const fetch = createDevApp([
      defineEndpoint({
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
      }),
    ]);

    const response = await fetch(new Request("http://local/users/123", { method: "GET" }));
    expect(response.status).toBe(404);
    expect((await response.json()) as { error?: string }).toEqual({
      error: "User 123 not found",
    });
  });

  it("returns 500 when output does not match declared status response schema", async () => {
    const fetch = createDevApp([
      defineEndpoint({
        method: "GET",
        path: "/users/{id}",
        handler: () => ({
          statusCode: 404,
          value: { message: "missing" },
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
      }),
    ]);

    const response = await fetch(new Request("http://local/users/123", { method: "GET" }));
    expect(response.status).toBe(500);
    expect((await response.json()) as { error?: string }).toEqual({
      error: "Output validation failed",
    });
  });
});
