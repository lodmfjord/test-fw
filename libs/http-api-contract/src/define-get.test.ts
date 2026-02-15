/**
 * @fileoverview Tests defineGet behavior.
 */
import { beforeEach, describe, expect, it } from "bun:test";
import { schema } from "@babbstack/schema";
import { defineGet } from "./define-get";
import { listDefinedEndpoints } from "./list-defined-endpoints";
import { resetDefinedEndpoints } from "./reset-defined-endpoints";

describe("defineGet", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("defines and registers a GET endpoint", () => {
    const endpoint = defineGet({
      handler: ({ params }) => ({ value: { id: params.id } }),
      path: "/users/:id",
      request: {
        params: schema.object({ id: schema.string() }),
      },
      response: schema.object({ id: schema.string() }),
    });

    expect(endpoint.method).toBe("GET");
    expect(listDefinedEndpoints().at(0)?.method).toBe("GET");
  });
});
