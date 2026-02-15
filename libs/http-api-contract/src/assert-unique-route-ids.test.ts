/**
 * @fileoverview Tests assertUniqueRouteIds behavior.
 */
import { describe, expect, it } from "bun:test";
import { assertUniqueRouteIds } from "./assert-unique-route-ids";

describe("assertUniqueRouteIds", () => {
  it("allows duplicate route ids for the same method and path", () => {
    expect(() =>
      assertUniqueRouteIds([
        { method: "GET", path: "/users", routeId: "get_users" },
        { method: "GET", path: "/users", routeId: "get_users" },
      ]),
    ).not.toThrow();
  });

  it("throws when different routes share the same route id", () => {
    expect(() =>
      assertUniqueRouteIds([
        { method: "GET", path: "/users", routeId: "route" },
        { method: "POST", path: "/users", routeId: "route" },
      ]),
    ).toThrow('Route ID collision: "route" is shared by GET /users and POST /users');
  });
});
