/**
 * @fileoverview Tests toTerraformJsonString behavior.
 */
import { describe, expect, it } from "bun:test";
import { toTerraformJsonString } from "./to-terraform-json-string";

describe("toTerraformJsonString", () => {
  it("renders pretty JSON with trailing newline", () => {
    const result = toTerraformJsonString({ a: 1 });

    expect(result).toBe(`{
  "a": 1
}
`);
  });
});
