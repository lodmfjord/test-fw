/**
 * @fileoverview Tests toOpenApiDocumentFromRoutes behavior.
 */
import { describe, expect, it } from "bun:test";
import { defineRoute } from "./define-route";
import { toOpenApiDocumentFromRoutes } from "./to-openapi-document-from-routes";

describe("toOpenApiDocumentFromRoutes", () => {
  it("renders operations and uses 204 for OPTIONS responses", () => {
    const getRoute = defineRoute({
      handler: "get_users_handler",
      method: "GET",
      path: "/users",
    });
    const optionsRoute = defineRoute({
      handler: "options_users_handler",
      method: "OPTIONS",
      path: "/users",
    });

    const document = toOpenApiDocumentFromRoutes({
      apiName: "demo",
      routes: [getRoute, optionsRoute],
      version: "1.0.0",
    });

    expect(document.openapi).toBe("3.1.0");
    expect(document.paths["/users"]?.get?.responses["200"]).toBeDefined();
    expect(document.paths["/users"]?.options?.responses["204"]).toBeDefined();
    expect(document.paths["/users"]?.get?.["x-babbstack"].handler).toBe("get_users_handler");
  });
});
