/**
 * @fileoverview Tests toContract behavior.
 */
import { describe, expect, it } from "bun:test";
import { toContract } from "./to-contract";

describe("toContract", () => {
  it("returns the contract object when valid", () => {
    const value: unknown = {
      deployContract: {},
      envSchema: {},
      lambdasManifest: {},
      openapi: {},
      routesManifest: {},
    };

    expect(Object.is(toContract(value, "contract"), value)).toBe(true);
  });

  it("throws for invalid contract exports", () => {
    expect(() => toContract(undefined, "contract")).toThrow(
      'Contract export "contract" was not found or is invalid',
    );
  });
});
