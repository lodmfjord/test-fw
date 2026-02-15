/**
 * @fileoverview Tests toRoutesWithGlobalCorsOptions behavior.
 */
import { describe, expect, it } from "bun:test";
import { defineRoute } from "./define-route";
import { toRoutesWithGlobalCorsOptions } from "./to-routes-with-global-cors-options";

describe("toRoutesWithGlobalCorsOptions", () => {
  it("adds synthetic OPTIONS routes when missing", () => {
    const routes = [
      defineRoute({
        handler: "users_handler",
        method: "GET",
        path: "/users",
      }),
    ];

    const output = toRoutesWithGlobalCorsOptions(routes, {
      allowOrigin: "*",
    });

    expect(output.some((route) => route.method === "OPTIONS" && route.path === "/users")).toBe(
      true,
    );
  });

  it("does not add OPTIONS when already defined", () => {
    const routes = [
      defineRoute({
        handler: "users_get_handler",
        method: "GET",
        path: "/users",
      }),
      defineRoute({
        handler: "users_options_handler",
        method: "OPTIONS",
        path: "/users",
      }),
    ];

    const output = toRoutesWithGlobalCorsOptions(routes, {
      allowOrigin: "*",
    });

    const optionsCount = output.filter(
      (route) => route.method === "OPTIONS" && route.path === "/users",
    ).length;
    expect(optionsCount).toBe(1);
  });
});
