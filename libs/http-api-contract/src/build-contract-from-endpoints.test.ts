import { describe, expect, it } from "bun:test";
import { buildContractFromEndpoints } from "./build-contract-from-endpoints";
import { defineEndpoint } from "./define-endpoint";
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
});
