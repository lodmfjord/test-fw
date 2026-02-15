/**
 * @fileoverview Tests to memory s3 logger.
 */
import { describe, expect, it } from "bun:test";
import type { Logger } from "@babbstack/logger";
import { toMemoryS3Logger } from "./to-memory-s3-logger";

describe("toMemoryS3Logger", () => {
  it("uses injected logger object when provided", () => {
    const logger: Logger = {
      debug() {},
      error() {},
      getPersistentKeys() {
        return {
          service: "s3",
        };
      },
      info() {},
      warn() {},
    };

    expect(toMemoryS3Logger({ logger })).toBe(logger);
  });

  it("adapts legacy log callback to logger methods", () => {
    const messages: string[] = [];
    const logger = toMemoryS3Logger({
      log(message) {
        messages.push(message);
      },
    });

    logger.info("message", { key: "value" });
    expect(messages).toEqual(['message {"key":"value"}']);
  });
});
