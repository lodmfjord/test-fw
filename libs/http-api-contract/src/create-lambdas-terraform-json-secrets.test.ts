/**
 * @fileoverview Tests createLambdasTerraformJson secret env checks.
 */
import { describe, expect, it } from "bun:test";
import { createLambdasTerraformJson } from "./create-lambdas-terraform-json";

describe("createLambdasTerraformJson secret env checks", () => {
  it("adds terraform ssm parameter data checks and route iam read policy for secret env vars", () => {
    const expectedForEach = `$${"{local.lambda_secret_env_parameter_name_by_key}"}`;
    const expectedName = `$${"{each.value}"}`;
    const terraformJson = createLambdasTerraformJson(
      {
        lambdasManifest: {
          functions: [
            {
              architecture: "arm64",
              artifactPath: "get-env.zip",
              method: "GET",
              path: "/env-demo",
              routeId: "get_env_demo",
              runtime: "nodejs20.x",
            },
          ],
        },
        routesManifest: {
          routes: [
            {
              env: {
                SIMPLE_API_TEST_APP_ENV_SECRET:
                  "simple-api:ssm:/simple-api/test-app/env-secret|local-env:SECRET_BLE",
              },
              routeId: "get_env_demo",
            },
          ],
        },
      } as never,
      [],
      [],
      undefined,
      false,
      false,
    ) as {
      data?: {
        aws_ssm_parameter?: {
          lambda_secret_env?: {
            for_each: string;
            name: string;
            with_decryption: boolean;
          };
        };
      };
      locals: {
        lambda_secret_env_parameter_keys_by_route?: Record<string, string[]>;
        lambda_secret_env_parameter_name_by_key?: Record<string, string>;
      };
      resource: {
        aws_iam_role_policy?: {
          route_ssm_parameter?: unknown;
        };
      };
      variable: Record<string, unknown>;
    };

    expect(terraformJson.locals.lambda_secret_env_parameter_name_by_key).toEqual({
      parameter_0: "/simple-api/test-app/env-secret",
    });
    expect(terraformJson.locals.lambda_secret_env_parameter_keys_by_route).toEqual({
      get_env_demo: ["parameter_0"],
    });
    expect(terraformJson.data?.aws_ssm_parameter?.lambda_secret_env).toEqual({
      for_each: expectedForEach,
      name: expectedName,
      with_decryption: true,
    });
    expect(terraformJson.resource.aws_iam_role_policy?.route_ssm_parameter).toBeDefined();
    expect(terraformJson.variable.lambda_ssm_parameter_policy_name_prefix).toBeDefined();
  });
});
