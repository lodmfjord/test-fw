/**
 * @fileoverview Tests defineDelete behavior.
 */
import { beforeEach, describe, expect, it } from "bun:test";
import { schema } from "@babbstack/schema";
import { defineDelete } from "./define-delete";
import { listDefinedEndpoints } from "./list-defined-endpoints";
import { resetDefinedEndpoints } from "./reset-defined-endpoints";

describe("defineDelete", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("defines and registers a DELETE endpoint", () => {
    const endpoint = defineDelete({
      handler: ({ params }) => ({ value: { deleted: params.id } }),
      path: "/users/:id",
      request: {
        params: schema.object({ id: schema.string() }),
      },
      response: schema.object({ deleted: schema.string() }),
    });

    expect(endpoint.method).toBe("DELETE");
    expect(listDefinedEndpoints().at(0)?.method).toBe("DELETE");
  });
});
