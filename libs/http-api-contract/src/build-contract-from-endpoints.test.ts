import { describe, expect, it } from "bun:test";
import { buildContractFromEndpoints } from "./build-contract-from-endpoints";
import { defineEndpoint } from "./define-endpoint";
import { defineOptions } from "./define-options";
import { definePost } from "./define-post";
import { schema } from "@babbstack/schema";

describe("buildContractFromEndpoints", () => {
  it("builds one lambda per endpoint and includes input/output schemas in OpenAPI", () => {
    const contract = buildContractFromEndpoints({
      apiName: "users-api",
      version: "1.0.0",
      endpoints: [
        defineEndpoint({
          access: {
            db: "read",
          },
          method: "GET",
          path: "/users/{id}",
          handler: ({ params }) => ({ value: { id: params.id, name: "A" } }),
          request: {
            params: schema.object({
              id: schema.string(),
            }),
          },
          response: schema.object({
            id: schema.string(),
            name: schema.string(),
          }),
        }),
        defineEndpoint({
          method: "POST",
          path: "/users",
          handler: ({ body }) => ({ value: { id: body.name } }),
          request: {
            body: schema.object({
              name: schema.string(),
            }),
          },
          response: schema.object({
            id: schema.string(),
          }),
        }),
      ],
    });

    expect(contract.lambdasManifest.functions).toHaveLength(2);
    expect(contract.lambdasManifest.functions[0]?.functionId).toBe("get_users_param_id");
    expect(contract.lambdasManifest.functions[1]?.functionId).toBe("post_users");
    expect(contract.lambdasManifest.functions[0]?.handler).toBe("get_users_param_id_handler");
    expect(contract.lambdasManifest.functions[1]?.handler).toBe("post_users_handler");

    const getOperation = contract.openapi.paths["/users/{id}"]?.get;
    expect(getOperation?.parameters?.[0]?.in).toBe("path");
    expect(getOperation?.parameters?.[0]?.name).toBe("id");
    expect(getOperation?.["x-babbstack"].access?.db).toBe("read");

    const postOperation = contract.openapi.paths["/users"]?.post;
    expect(postOperation?.requestBody?.content["application/json"].schema.type).toBe("object");
    expect(postOperation?.responses["200"]?.content?.["application/json"]?.schema.type).toBe(
      "object",
    );
  });

  it("adds one synthetic OPTIONS endpoint per unique path when global cors is enabled", () => {
    const contract = buildContractFromEndpoints({
      apiName: "users-api",
      cors: {
        allowOrigin: "https://app.example.com",
      },
      version: "1.0.0",
      endpoints: [
        defineEndpoint({
          method: "GET",
          path: "/users",
          handler: () => ({ value: { ok: true } }),
          response: schema.object({
            ok: schema.boolean(),
          }),
        }),
        defineEndpoint({
          method: "POST",
          path: "/users",
          handler: () => ({ value: { ok: true } }),
          response: schema.object({
            ok: schema.boolean(),
          }),
        }),
        defineEndpoint({
          method: "PATCH",
          path: "/users",
          handler: () => ({ value: { ok: true } }),
          response: schema.object({
            ok: schema.boolean(),
          }),
        }),
        defineEndpoint({
          method: "GET",
          path: "/health",
          handler: () => ({ value: { ok: true } }),
          response: schema.object({
            ok: schema.boolean(),
          }),
        }),
      ],
    });

    const optionRoutes = contract.routesManifest.routes.filter(
      (route) => route.method === "OPTIONS",
    );
    expect(optionRoutes).toHaveLength(2);
    expect(
      optionRoutes.map((route) => route.path).sort((left, right) => left.localeCompare(right)),
    ).toEqual(["/health", "/users"]);
    expect(contract.openapi.paths["/users"]?.options?.operationId).toBe("optionsUsers");
    expect(
      contract.lambdasManifest.functions.some((item) => item.routeId === "options_users"),
    ).toBe(true);
  });

  it("does not add a synthetic OPTIONS endpoint when one already exists", () => {
    const contract = buildContractFromEndpoints({
      apiName: "users-api",
      cors: {
        allowOrigin: "*",
      },
      version: "1.0.0",
      endpoints: [
        defineEndpoint({
          method: "GET",
          path: "/users",
          handler: () => ({ value: { ok: true } }),
          response: schema.object({
            ok: schema.boolean(),
          }),
        }),
        defineOptions({
          path: "/users",
          handler: () => ({ value: {} }),
          response: schema.object({}),
        }),
      ],
    });

    const optionRoutes = contract.routesManifest.routes.filter(
      (route) => route.method === "OPTIONS" && route.path === "/users",
    );
    expect(optionRoutes).toHaveLength(1);
  });

  it("uses 204 response status for explicit OPTIONS endpoints in OpenAPI", () => {
    const contract = buildContractFromEndpoints({
      apiName: "users-api",
      version: "1.0.0",
      endpoints: [
        defineOptions({
          path: "/users",
          handler: () => ({ value: {} }),
          response: schema.object({}),
        }),
      ],
    });

    const operation = contract.openapi.paths["/users"]?.options;
    expect(operation?.responses["204"]?.content?.["application/json"]?.schema.type).toBe("object");
    expect(operation?.responses["200"]).toBeUndefined();
  });

  it("uses 202 for async step-function endpoint responses in OpenAPI", () => {
    const contract = buildContractFromEndpoints({
      apiName: "users-api",
      version: "1.0.0",
      endpoints: [
        definePost({
          execution: {
            definition:
              '{"StartAt":"Done","States":{"Done":{"Type":"Pass","Result":{"ok":true},"End":true}}}',
            invocationType: "async",
            kind: "step-function",
            stateMachineName: "users-async-flow",
          },
          path: "/users/async-flow",
          response: schema.object({
            executionArn: schema.string(),
            status: schema.string(),
          }),
        }),
      ],
    });

    const operation = contract.openapi.paths["/users/async-flow"]?.post;
    expect(operation?.responses["202"]?.content?.["application/json"]?.schema.type).toBe("object");
    expect(operation?.responses["200"]).toBeUndefined();
  });

  it("uses explicit successStatusCode for OpenAPI success responses", () => {
    const contract = buildContractFromEndpoints({
      apiName: "users-api",
      version: "1.0.0",
      endpoints: [
        definePost({
          path: "/users",
          handler: ({ body }) => ({ value: { id: body.name } }),
          request: {
            body: schema.object({
              name: schema.string(),
            }),
          },
          response: schema.object({
            id: schema.string(),
          }),
          successStatusCode: 201,
        }),
      ],
    });

    const operation = contract.openapi.paths["/users"]?.post;
    expect(operation?.responses["201"]?.content?.["application/json"]?.schema.type).toBe("object");
    expect(operation?.responses["200"]).toBeUndefined();
  });

  it("includes additional response schemas in OpenAPI", () => {
    const contract = buildContractFromEndpoints({
      apiName: "users-api",
      version: "1.0.0",
      endpoints: [
        definePost({
          path: "/users/{id}",
          handler: ({ params }) => ({
            statusCode: 404,
            value: { error: `User ${params.id} not found` },
          }),
          request: {
            params: schema.object({
              id: schema.string(),
            }),
          },
          response: schema.object({
            id: schema.string(),
          }),
          responses: {
            404: schema.object({
              error: schema.string(),
            }),
          },
        }),
      ],
    });

    const operation = contract.openapi.paths["/users/{id}"]?.post;
    expect(operation?.responses["200"]?.content?.["application/json"]?.schema.type).toBe("object");
    expect(operation?.responses["404"]?.content?.["application/json"]?.schema.type).toBe("object");
  });
});
