/**
 * @fileoverview Tests create client helpers.
 */
import { describe, expect, it } from "bun:test";
import { createClientHelpers } from "./create-client-helpers";

describe("createClientHelpers", () => {
  it("returns helper functions for client creation", () => {
    const helpers = createClientHelpers();

    expect(typeof helpers.toBaseUrl).toBe("function");
    expect(typeof helpers.toResolvedPath).toBe("function");
    expect(typeof helpers.appendQuery).toBe("function");
    expect(typeof helpers.toStringHeaders).toBe("function");
    expect(typeof helpers.toRequestBody).toBe("function");
    expect(typeof helpers.toResponseData).toBe("function");
    expect(typeof helpers.toResponseHeaders).toBe("function");
    expect(typeof helpers.toPathKey).toBe("function");
    expect(typeof helpers.toEndpointList).toBe("function");
  });

  it("flattens nested endpoint arrays into route descriptors", () => {
    const helpers = createClientHelpers();

    expect(
      helpers.toEndpointList([
        [{ method: "GET", path: "/users/{id}", routeId: "get_users_param_id" }],
        { method: "POST", path: "/users", routeId: "post_users" },
      ]),
    ).toEqual([
      { method: "GET", path: "/users/{id}", routeId: "get_users_param_id" },
      { method: "POST", path: "/users", routeId: "post_users" },
    ]);
  });
});
