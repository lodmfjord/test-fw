/** @fileoverview Tests to secret definition. @module libs/http-api-contract/src/to-secret-definition.test */
import { describe, expect, it } from "bun:test";
import { toSecretDefinition } from "./to-secret-definition";

describe("toSecretDefinition", () => {
  it("parses a plain ssm secret marker", () => {
    expect(toSecretDefinition("simple-api:ssm:/app/token")).toEqual({
      parameterName: "/app/token",
    });
  });

  it("parses local env fallback marker", () => {
    expect(toSecretDefinition("simple-api:ssm:/app/token|local-env:SECRET_BLE")).toEqual({
      localEnvName: "SECRET_BLE",
      parameterName: "/app/token",
    });
  });
});
