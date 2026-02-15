/**
 * @fileoverview Tests resetDefinedEndpoints behavior.
 */
import { beforeEach, describe, expect, it } from "bun:test";
import { schema } from "@babbstack/schema";
import { defineGet } from "./define-get";
import { listDefinedEndpoints } from "./list-defined-endpoints";
import { resetDefinedEndpoints } from "./reset-defined-endpoints";

describe("resetDefinedEndpoints", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("clears the endpoint registry", () => {
    defineGet({
      handler: ({ params }) => ({ value: { id: params.id } }),
      path: "/users/:id",
      request: {
        params: schema.object({ id: schema.string() }),
      },
      response: schema.object({ id: schema.string() }),
    });

    expect(listDefinedEndpoints()).toHaveLength(1);
    resetDefinedEndpoints();
    expect(listDefinedEndpoints()).toEqual([]);
  });
});
