/**
 * @fileoverview Tests create logger.
 */
import { describe, expect, it } from "bun:test";
import { createLogger } from "./create-logger";

describe("createLogger", () => {
  it("creates a logger with standard methods", () => {
    const logger = createLogger({
      serviceName: "orders",
    });

    expect(logger).toBeDefined();
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  it("passes persistent keys to the underlying logger", () => {
    const logger = createLogger({
      persistentKeys: {
        domain: "billing",
      },
      serviceName: "orders",
    });

    expect(logger.getPersistentKeys()).toEqual({
      domain: "billing",
    });
  });
});
