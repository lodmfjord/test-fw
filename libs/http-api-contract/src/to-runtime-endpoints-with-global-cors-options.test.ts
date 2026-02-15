/**
 * @fileoverview Tests toRuntimeEndpointsWithGlobalCorsOptions behavior.
 */
import { describe, expect, it } from "bun:test";
import { schema } from "@babbstack/schema";
import { defineEndpoint } from "./define-endpoint";
import { defineRoute } from "./define-route";
import { toRuntimeEndpointsWithGlobalCorsOptions } from "./to-runtime-endpoints-with-global-cors-options";

describe("toRuntimeEndpointsWithGlobalCorsOptions", () => {
  it("adds runtime OPTIONS handlers with cors headers", () => {
    const endpoint = defineEndpoint({
      handler: () => ({ value: { ok: true } }),
      method: "GET",
      path: "/users",
      response: schema.object({ ok: schema.boolean() }),
    });
    const routes = [
      defineRoute({
        handler: "get_users_handler",
        method: "GET",
        path: "/users",
      }),
      defineRoute({
        handler: "options_users_handler",
        method: "OPTIONS",
        path: "/users",
      }),
    ];

    const endpoints = toRuntimeEndpointsWithGlobalCorsOptions(
      {
        deployContract: {
          apiGateway: {
            cors: {
              allowOrigin: "*",
            },
          },
        },
        routesManifest: {
          routes,
        },
      } as never,
      [endpoint],
    );

    const optionsEndpoint = endpoints.find((entry) => entry.method === "OPTIONS");
    expect(optionsEndpoint).toBeDefined();
    if (!optionsEndpoint?.handler) {
      throw new Error("expected OPTIONS endpoint handler to be defined");
    }

    const output = optionsEndpoint.handler({} as never);
    expect(output).toEqual({
      headers: {
        "access-control-allow-headers": "*",
        "access-control-allow-methods": "GET,OPTIONS",
        "access-control-allow-origin": "*",
      },
      statusCode: 204,
      value: {},
    });
  });
});
