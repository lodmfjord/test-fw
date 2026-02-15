/**
 * @fileoverview Tests build-contract-from-endpoints response status behavior.
 */
import { describe, expect, it } from "bun:test";
import { schema } from "@babbstack/schema";
import { buildContractFromEndpoints } from "./build-contract-from-endpoints";
import { defineOptions } from "./define-options";
import { definePost } from "./define-post";

describe("buildContractFromEndpoints response statuses", () => {
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
