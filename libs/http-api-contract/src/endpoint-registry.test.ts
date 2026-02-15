/**
 * @fileoverview Tests endpoint registry.
 */
import { beforeEach, describe, expect, it } from "bun:test";
import { defineGet } from "./define-get";
import { definePost } from "./define-post";
import { listDefinedEndpoints } from "./list-defined-endpoints";
import { resetDefinedEndpoints } from "./reset-defined-endpoints";
import { schema } from "@babbstack/schema";

describe("endpoint registry", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("registers endpoints when defineGet and definePost are called", () => {
    defineGet({
      path: "/health",
      handler: () => ({ value: { status: "ok" } }),
      response: schema.object({
        status: schema.string(),
      }),
    });

    definePost({
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
    });

    const endpoints = listDefinedEndpoints();

    expect(endpoints).toHaveLength(2);
    expect(endpoints[0]?.method).toBe("GET");
    expect(endpoints[1]?.method).toBe("POST");
  });

  it("upserts endpoint when the same method and path are defined twice", () => {
    defineGet({
      path: "/health",
      handler: () => ({ value: { status: "ok-v1" } }),
      handlerId: "health_handler_v1",
      response: schema.object({
        status: schema.string(),
      }),
    });

    defineGet({
      path: "/health",
      handler: () => ({ value: { status: "ok-v2" } }),
      handlerId: "health_handler_v2",
      response: schema.object({
        status: schema.string(),
      }),
    });

    const endpoints = listDefinedEndpoints();

    expect(endpoints).toHaveLength(1);
    expect(endpoints[0]?.handlerId).toBe("health_handler_v2");
  });

  it("rejects endpoints with colliding route ids across different paths", () => {
    defineGet({
      path: "/users-roles",
      handler: () => ({ value: { status: "ok" } }),
      response: schema.object({
        status: schema.string(),
      }),
    });

    expect(() =>
      defineGet({
        path: "/users_roles",
        handler: () => ({ value: { status: "ok" } }),
        response: schema.object({
          status: schema.string(),
        }),
      }),
    ).toThrow('Route ID collision: "get_users_roles"');
  });
});
