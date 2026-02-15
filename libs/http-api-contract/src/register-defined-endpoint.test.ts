/**
 * @fileoverview Tests registerDefinedEndpoint behavior.
 */
import { beforeEach, describe, expect, it } from "bun:test";
import { schema } from "@babbstack/schema";
import { defineGet } from "./define-get";
import { listDefinedEndpoints } from "./list-defined-endpoints";
import { registerDefinedEndpoint } from "./register-defined-endpoint";
import { resetDefinedEndpoints } from "./reset-defined-endpoints";

describe("registerDefinedEndpoint", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("upserts endpoint by method and path", () => {
    const first = defineGet({
      handler: ({ params }) => ({ value: { id: params.id } }),
      path: "/users/:id",
      request: {
        params: schema.object({ id: schema.string() }),
      },
      response: schema.object({ id: schema.string() }),
    });

    const updated = {
      ...first,
      description: "updated description",
    };

    registerDefinedEndpoint(updated);

    expect(listDefinedEndpoints()).toHaveLength(1);
    expect(listDefinedEndpoints().at(0)?.description).toBe("updated description");
  });
});
