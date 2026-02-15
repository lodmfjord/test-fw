/**
 * @fileoverview Tests defineHead behavior.
 */
import { beforeEach, describe, expect, it } from "bun:test";
import { schema } from "@babbstack/schema";
import { defineHead } from "./define-head";
import { listDefinedEndpoints } from "./list-defined-endpoints";
import { resetDefinedEndpoints } from "./reset-defined-endpoints";

describe("defineHead", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("defines and registers a HEAD endpoint", () => {
    const endpoint = defineHead({
      handler: () => ({ value: {} }),
      path: "/health",
      response: schema.object({}),
    });

    expect(endpoint.method).toBe("HEAD");
    expect(listDefinedEndpoints().at(0)?.method).toBe("HEAD");
  });
});
