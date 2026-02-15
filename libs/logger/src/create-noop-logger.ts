/**
 * @fileoverview Implements create noop logger.
 */
import type { Logger } from "./types";

const NOOP_LOGGER: Logger = {
  debug() {},
  error() {},
  getPersistentKeys() {
    return {};
  },
  info() {},
  warn() {},
};

/**
 * Creates noop logger.
 * @example
 * createNoopLogger()
 * @returns Output value.
 */
export function createNoopLogger(): Logger {
  return NOOP_LOGGER;
}
