/**
 * @fileoverview Tests definePost behavior.
 */
import { beforeEach, describe, expect, it } from "bun:test";
import { schema } from "@babbstack/schema";
import { definePost } from "./define-post";
import { listDefinedEndpoints } from "./list-defined-endpoints";
import { resetDefinedEndpoints } from "./reset-defined-endpoints";

describe("definePost", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("defines and registers a POST endpoint", () => {
    const endpoint = definePost({
      handler: ({ body }) => ({ value: { id: body.name } }),
      path: "/users",
      request: {
        body: schema.object({ name: schema.string() }),
      },
      response: schema.object({ id: schema.string() }),
    });

    expect(endpoint.method).toBe("POST");
    expect(listDefinedEndpoints().at(0)?.method).toBe("POST");
  });
});
