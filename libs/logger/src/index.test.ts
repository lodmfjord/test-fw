/**
 * @fileoverview Tests logger package exports.
 */
import { describe, expect, it } from "bun:test";
import { createLogger, createNoopLogger } from "./index";

describe("logger package exports", () => {
  it("exports createLogger and createNoopLogger", () => {
    expect(typeof createLogger).toBe("function");
    expect(typeof createNoopLogger).toBe("function");
  });
});
