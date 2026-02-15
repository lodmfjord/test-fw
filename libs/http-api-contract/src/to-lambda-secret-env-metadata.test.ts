/**
 * @fileoverview Tests toLambdaSecretEnvMetadata behavior.
 */
import { describe, expect, it } from "bun:test";
import { toLambdaSecretEnvMetadata } from "./to-lambda-secret-env-metadata";

describe("toLambdaSecretEnvMetadata", () => {
  it("collects unique secret parameter names for lambda routes only", () => {
    const metadata = toLambdaSecretEnvMetadata({
      lambdasManifest: {
        functions: [
          {
            routeId: "get_env_demo",
          },
        ],
      },
      routesManifest: {
        routes: [
          {
            env: {
              SECRET_A: "simple-api:ssm:/service/secret-a",
              SECRET_B: "simple-api:ssm:/service/secret-b|local-env:SECRET_BLE",
            },
            routeId: "get_env_demo",
          },
          {
            env: {
              SECRET_C: "simple-api:ssm:/service/secret-c",
            },
            routeId: "post_step_function_demo",
          },
        ],
      },
    } as never);

    expect(metadata.parameterNameByKey).toEqual({
      parameter_0: "/service/secret-a",
      parameter_1: "/service/secret-b",
    });
    expect(metadata.parameterKeysByRoute).toEqual({
      get_env_demo: ["parameter_0", "parameter_1"],
    });
  });
});
