/**
 * @fileoverview Tests start sqs listener polling.
 */
import { describe, expect, it } from "bun:test";
import type { Logger } from "@babbstack/logger";
import { startSqsListenerPolling } from "./start-sqs-listener-polling";

describe("startSqsListenerPolling", () => {
  it("returns early when there are no listeners", () => {
    const messages: string[] = [];
    const logger: Logger = {
      debug() {},
      error(message) {
        messages.push(message);
      },
      getPersistentKeys() {
        return {};
      },
      info(message) {
        messages.push(message);
      },
      warn() {},
    };

    startSqsListenerPolling([], {} as never, 10, logger);
    expect(messages).toEqual([]);
  });
});
