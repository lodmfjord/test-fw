/**
 * @fileoverview Tests create noop logger.
 */
import { describe, expect, it } from "bun:test";
import { createNoopLogger } from "./create-noop-logger";

describe("createNoopLogger", () => {
  it("returns stable no-op logger methods", () => {
    const logger = createNoopLogger();

    expect(() => logger.debug("debug message")).not.toThrow();
    expect(() => logger.info("info message")).not.toThrow();
    expect(() => logger.warn("warn message")).not.toThrow();
    expect(() => logger.error("error message")).not.toThrow();
  });
});
