/**
 * @fileoverview Tests build contract.
 */
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
    expect(contract.lambdasManifest.functions[0]?.timeoutSeconds).toBe(15);
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

  it("rejects route id collisions across different routes", () => {
    const usersRolesDashRoute = defineRoute({
      method: "GET",
      path: "/users-roles",
      handler: "src/users/get-roles-dash.ts#handler",
    });
    const usersRolesUnderscoreRoute = defineRoute({
      method: "GET",
      path: "/users_roles",
      handler: "src/users/get-roles-underscore.ts#handler",
    });

    expect(() =>
      buildContract({
        apiName: "example-api",
        version: "1.0.0",
        routes: [usersRolesDashRoute, usersRolesUnderscoreRoute],
      }),
    ).toThrow('Route ID collision: "get_users_roles"');
  });

  it("uses 204 response status for OPTIONS routes in OpenAPI", () => {
    const contract = buildContract({
      apiName: "example-api",
      version: "1.0.0",
      routes: [
        defineRoute({
          method: "OPTIONS",
          path: "/users",
          handler: "src/users/options.ts#handler",
        }),
      ],
    });

    expect(contract.openapi.paths["/users"]?.options?.responses["204"]?.description).toBe(
      "Success",
    );
    expect(contract.openapi.paths["/users"]?.options?.responses["200"]).toBeUndefined();
  });

  it("applies global lambda defaults and route aws overrides", () => {
    const contract = buildContract({
      apiName: "example-api",
      version: "1.0.0",
      lambdaDefaults: {
        ephemeralStorageMb: 1024,
        memoryMb: 1024,
        reservedConcurrency: 4,
        timeoutSeconds: 20,
      },
      routes: [
        defineRoute({
          method: "GET",
          path: "/users",
          handler: "src/users/get.ts#handler",
        }),
        defineRoute({
          method: "POST",
          path: "/users",
          handler: "src/users/post.ts#handler",
          aws: {
            memoryMb: 2048,
            reservedConcurrency: 1,
          },
        }),
      ],
    });

    expect(contract.lambdasManifest.functions).toHaveLength(2);
    expect(contract.lambdasManifest.functions[0]).toMatchObject({
      architecture: "arm64",
      ephemeralStorageMb: 1024,
      memoryMb: 1024,
      reservedConcurrency: 4,
      timeoutSeconds: 20,
    });
    expect(contract.lambdasManifest.functions[1]).toMatchObject({
      architecture: "arm64",
      ephemeralStorageMb: 1024,
      memoryMb: 2048,
      reservedConcurrency: 1,
      timeoutSeconds: 20,
    });
  });
});
