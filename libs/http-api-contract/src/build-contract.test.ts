import { describe, expect, it } from "bun:test";
import { buildContract } from "./build-contract";
import { defineRoute } from "./define-route";

describe("buildContract", () => {
  it("builds openapi and lambda manifests", () => {
    const contract = buildContract({
      apiName: "example-api",
      version: "1.0.0",
      routes: [
        defineRoute({
          method: "GET",
          path: "/users/{id}",
          handler: "src/users/get.ts#handler",
          tags: ["users"],
        }),
        defineRoute({
          method: "POST",
          path: "/users",
          handler: "src/users/post.ts#handler",
          auth: "jwt",
          aws: {
            timeoutSeconds: 30,
            memoryMb: 512,
          },
        }),
      ],
      env: [
        {
          name: "USERS_TABLE",
          required: true,
          description: "DynamoDB table name",
        },
      ],
    });

    expect(contract.openapi.paths["/users/{id}"]?.get?.operationId).toBe("getUsersParamId");
    expect(contract.openapi.paths["/users"]?.post?.["x-babbstack"]?.auth).toBe("jwt");

    expect(contract.routesManifest.routes).toHaveLength(2);
    expect(contract.lambdasManifest.functions).toHaveLength(2);

    expect(contract.lambdasManifest.functions[0]?.functionId).toBe("get_users_param_id");
    expect(contract.lambdasManifest.functions[1]?.timeoutSeconds).toBe(30);
    expect(contract.lambdasManifest.functions[1]?.memoryMb).toBe(512);

    expect(contract.deployContract.apiGateway.type).toBe("http-api-v2");
    expect(contract.deployContract.lambdaPackaging.strategy).toBe("one-route-per-lambda");

    expect(contract.envSchema.required).toEqual(["USERS_TABLE"]);
    expect(contract.envSchema.properties.USERS_TABLE?.type).toBe("string");
  });

  it("rejects duplicate method and path pairs", () => {
    const route = defineRoute({
      method: "GET",
      path: "/users",
      handler: "src/users/get.ts#handler",
    });

    expect(() =>
      buildContract({
        apiName: "example-api",
        version: "1.0.0",
        routes: [route, route],
      }),
    ).toThrow("Duplicate route");
  });
});
