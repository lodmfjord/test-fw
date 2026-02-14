import { describe, expect, it } from "bun:test";
import { createDevApp } from "./create-dev-app";
import { defineEndpoint } from "./define-endpoint";
import { schema } from "@babbstack/schema";

describe("createDevApp successStatusCode", () => {
  it("uses endpoint successStatusCode when handler output omits statusCode", async () => {
    const fetch = createDevApp([
      defineEndpoint({
        method: "POST",
        path: "/users",
        handler: ({ body }) => ({
          value: { id: body.name },
        }),
        request: {
          body: schema.object({
            name: schema.string(),
          }),
        },
        response: schema.object({
          id: schema.string(),
        }),
        successStatusCode: 201,
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

    expect(response.status).toBe(201);
    expect((await response.json()) as { id?: string }).toEqual({ id: "sam" });
  });
});
