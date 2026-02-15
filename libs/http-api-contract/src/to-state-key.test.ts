/**
 * @fileoverview Tests toStateKey behavior.
 */
import { describe, expect, it } from "bun:test";
import { toStateKey } from "./to-state-key";

describe("toStateKey", () => {
  it("returns the default terraform state file name", () => {
    expect(toStateKey({ enabled: false })).toBe("terraform.tfstate");
  });
});
