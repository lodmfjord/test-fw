/**
 * @fileoverview Tests definePatch behavior.
 */
import { beforeEach, describe, expect, it } from "bun:test";
import { schema } from "@babbstack/schema";
import { definePatch } from "./define-patch";
import { listDefinedEndpoints } from "./list-defined-endpoints";
import { resetDefinedEndpoints } from "./reset-defined-endpoints";

describe("definePatch", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("defines and registers a PATCH endpoint", () => {
    const endpoint = definePatch({
      handler: ({ body, params }) => ({ value: { id: params.id, name: body.name } }),
      path: "/users/:id",
      request: {
        body: schema.object({ name: schema.string() }),
        params: schema.object({ id: schema.string() }),
      },
      response: schema.object({ id: schema.string(), name: schema.string() }),
    });

    expect(endpoint.method).toBe("PATCH");
    expect(listDefinedEndpoints().at(0)?.method).toBe("PATCH");
  });
});
