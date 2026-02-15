/**
 * @fileoverview Tests renderLambdaEnvBootstrapSource behavior.
 */
import { describe, expect, it } from "bun:test";
import { renderLambdaEnvBootstrapSource } from "./render-lambda-env-bootstrap-source";

describe("renderLambdaEnvBootstrapSource", () => {
  it("separates plain env values from secret env markers", () => {
    const source = renderLambdaEnvBootstrapSource({
      env: {
        API_KEY: "simple-api:ssm:/service/api-key|local-env:LOCAL_API_KEY",
        APP_ENV: "test",
      },
    } as never);

    expect(source).toContain('const endpointEnv = {"APP_ENV":"test"};');
    expect(source).toContain('"envName":"API_KEY"');
    expect(source).toContain('"parameterName":"/service/api-key"');
    expect(source).toContain('"localEnvName":"LOCAL_API_KEY"');
    expect(source).toContain("Would load parameter");
    expect(source).not.toContain(
      '"API_KEY":"simple-api:ssm:/service/api-key|local-env:LOCAL_API_KEY"',
    );
  });
});
