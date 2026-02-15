/**
 * @fileoverview Tests defineOptions behavior.
 */
import { beforeEach, describe, expect, it } from "bun:test";
import { schema } from "@babbstack/schema";
import { defineOptions } from "./define-options";
import { listDefinedEndpoints } from "./list-defined-endpoints";
import { resetDefinedEndpoints } from "./reset-defined-endpoints";

describe("defineOptions", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("defines and registers an OPTIONS endpoint", () => {
    const endpoint = defineOptions({
      handler: () => ({ statusCode: 204, value: {} }),
      path: "/users",
      response: schema.object({}),
    });

    expect(endpoint.method).toBe("OPTIONS");
    expect(listDefinedEndpoints().at(0)?.method).toBe("OPTIONS");
  });
});
