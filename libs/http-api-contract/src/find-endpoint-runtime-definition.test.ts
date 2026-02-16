/**
 * @fileoverview Tests findEndpointRuntimeDefinition behavior.
 */
import { beforeEach, describe, expect, it } from "bun:test";
import { schema } from "@babbstack/schema";
import { defineGet } from "./define-get";
import { findEndpointRuntimeDefinition } from "./find-endpoint-runtime-definition";
import { listDefinedEndpoints } from "./list-defined-endpoints";
import { resetDefinedEndpoints } from "./reset-defined-endpoints";

describe("findEndpointRuntimeDefinition", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("matches path params and decodes values", () => {
    defineGet({
      handler: ({ params }) => ({ value: { id: params.id } }),
      path: "/users/:id",
      request: {
        params: schema.object({ id: schema.string() }),
      },
      response: schema.object({ id: schema.string() }),
    });

    const matched = findEndpointRuntimeDefinition(listDefinedEndpoints(), "GET", "/users/a%20b");

    expect(matched?.params).toEqual({ id: "a b" });
    expect(matched?.endpoint.path).toBe("/users/{id}");
  });

  it("returns undefined for malformed percent-encoded path params", () => {
    defineGet({
      handler: ({ params }) => ({ value: { id: params.id } }),
      path: "/users/:id",
      request: {
        params: schema.object({ id: schema.string() }),
      },
      response: schema.object({ id: schema.string() }),
    });

    const matched = findEndpointRuntimeDefinition(listDefinedEndpoints(), "GET", "/users/%E0%A4%A");

    expect(matched).toBeUndefined();
  });

  it("returns undefined for non-matching method", () => {
    defineGet({
      handler: ({ params }) => ({ value: { id: params.id } }),
      path: "/users/:id",
      request: {
        params: schema.object({ id: schema.string() }),
      },
      response: schema.object({ id: schema.string() }),
    });

    const matched = findEndpointRuntimeDefinition(listDefinedEndpoints(), "POST", "/users/a");

    expect(matched).toBeUndefined();
  });
});
