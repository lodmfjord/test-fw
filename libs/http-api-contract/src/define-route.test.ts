import { describe, expect, it } from "bun:test";
import { defineRoute } from "./define-route";

describe("defineRoute", () => {
  it("normalizes method and path", () => {
    const route = defineRoute({
      method: "get",
      path: "users/:userId/",
      handler: "src/users/get-user.ts#handler",
    });

    expect(route.method).toBe("GET");
    expect(route.path).toBe("/users/{userId}");
    expect(route.routeId).toBe("get_users_param_userid");
    expect(route.operationId).toBe("getUsersParamUserid");
    expect(route.auth).toBe("none");
    expect(route.execution.kind).toBe("lambda");
    expect(route.tags).toEqual([]);
  });

  it("rejects unsupported methods", () => {
    expect(() =>
      defineRoute({
        method: "TRACE",
        path: "/status",
        handler: "src/status.ts#handler",
      }),
    ).toThrow("Unsupported method");
  });

  it("rejects paths that resolve to empty", () => {
    expect(() =>
      defineRoute({
        method: "GET",
        path: "   ",
        handler: "src/status.ts#handler",
      }),
    ).toThrow("Path is required");
  });
});
