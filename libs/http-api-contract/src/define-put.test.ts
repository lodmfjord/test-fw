/**
 * @fileoverview Tests definePut behavior.
 */
import { beforeEach, describe, expect, it } from "bun:test";
import { schema } from "@babbstack/schema";
import { definePut } from "./define-put";
import { listDefinedEndpoints } from "./list-defined-endpoints";
import { resetDefinedEndpoints } from "./reset-defined-endpoints";

describe("definePut", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("defines and registers a PUT endpoint", () => {
    const endpoint = definePut({
      handler: ({ body, params }) => ({ value: { id: params.id, name: body.name } }),
      path: "/users/:id",
      request: {
        body: schema.object({ name: schema.string() }),
        params: schema.object({ id: schema.string() }),
      },
      response: schema.object({ id: schema.string(), name: schema.string() }),
    });

    expect(endpoint.method).toBe("PUT");
    expect(listDefinedEndpoints().at(0)?.method).toBe("PUT");
  });
});
