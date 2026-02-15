/**
 * @fileoverview Tests createEnv behavior.
 */
import { describe, expect, it } from "bun:test";
import { createEnv } from "./create-env";

describe("createEnv", () => {
  it("returns a shallow copy of input env", () => {
    const input = { A: "1" };
    const output = createEnv(input);

    expect(output).toEqual({ A: "1" });
    expect(output).not.toBe(input);
  });
});
