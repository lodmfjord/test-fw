/**
 * @fileoverview Tests listDefinedEndpoints behavior.
 */
import { beforeEach, describe, expect, it } from "bun:test";
import { schema } from "@babbstack/schema";
import { defineGet } from "./define-get";
import { listDefinedEndpoints } from "./list-defined-endpoints";
import { resetDefinedEndpoints } from "./reset-defined-endpoints";

describe("listDefinedEndpoints", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("returns cloned endpoint objects", () => {
    defineGet({
      handler: ({ params }) => ({ value: { id: params.id } }),
      path: "/users/:id",
      request: {
        params: schema.object({ id: schema.string() }),
      },
      response: schema.object({ id: schema.string() }),
    });

    const firstRead = listDefinedEndpoints();
    const secondRead = listDefinedEndpoints();

    expect(firstRead.at(0)).not.toBe(secondRead.at(0));
    expect(firstRead.at(0)?.path).toBe("/users/{id}");
  });
});
