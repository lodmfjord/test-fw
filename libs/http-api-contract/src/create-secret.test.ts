import { describe, expect, it } from "bun:test";
import { createSecret } from "./create-secret";

describe("createSecret", () => {
  it("creates an ssm-prefixed env marker", () => {
    expect(createSecret("/my-app/private-key")).toBe("simple-api:ssm:/my-app/private-key");
  });

  it("supports local env fallback mapping", () => {
    expect(createSecret("/my-app/private-key", { localEnvName: "SECRET_BLE" })).toBe(
      "simple-api:ssm:/my-app/private-key|local-env:SECRET_BLE",
    );
  });

  it("rejects empty parameter names", () => {
    expect(() => createSecret("   ")).toThrow("createSecret parameterName is required");
  });

  it("rejects empty local env names", () => {
    expect(() =>
      createSecret("/my-app/private-key", {
        localEnvName: "   ",
      }),
    ).toThrow("createSecret localEnvName is required when provided");
  });
});
