/** @fileoverview Tests define route. @module libs/http-api-contract/src/define-route.test */
import { describe, expect, it } from "bun:test";
import { createEnv } from "./create-env";
import { createSecret } from "./create-secret";
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

  it("merges env values in declaration order", () => {
    const sharedEnv = createEnv({
      APP_NAME: "demo",
      SECRET_TOKEN: createSecret("/demo/token"),
    });
    const route = defineRoute({
      env: [sharedEnv, { APP_NAME: "demo-v2", FEATURE_FLAG: "on" }],
      method: "GET",
      path: "/status",
      handler: "src/status.ts#handler",
    });

    expect(route.env).toEqual({
      APP_NAME: "demo-v2",
      FEATURE_FLAG: "on",
      SECRET_TOKEN: "simple-api:ssm:/demo/token",
    });
  });
});
