/**
 * @fileoverview Implements to memory s3 logger.
 */
import { createNoopLogger } from "@babbstack/logger";
import type { Logger } from "@babbstack/logger";
import type { CreateMemoryS3Input } from "./types";

/** Converts to log line. */
function toLogLine(message: string, payload: unknown): string {
  if (!payload || typeof payload !== "object" || payload instanceof Error) {
    return `${message} ${String(payload)}`.trim();
  }

  return `${message} ${JSON.stringify(payload)}`;
}

/** Converts to function logger. */
function toFunctionLogger(log: (message: string) => void): Logger {
  return {
    debug(message, payload) {
      log(payload === undefined ? message : toLogLine(message, payload));
    },
    error(message, payload) {
      log(payload === undefined ? message : toLogLine(message, payload));
    },
    getPersistentKeys() {
      return {};
    },
    info(message, payload) {
      log(payload === undefined ? message : toLogLine(message, payload));
    },
    warn(message, payload) {
      log(payload === undefined ? message : toLogLine(message, payload));
    },
  };
}

/**
 * Converts to memory s3 logger.
 * @param input - Input parameter.
 * @example
 * toMemoryS3Logger(input)
 * @returns Output value.
 */
export function toMemoryS3Logger(input: CreateMemoryS3Input): Logger {
  if (typeof input.logger === "function") {
    return toFunctionLogger(input.logger);
  }

  if (input.logger) {
    return input.logger;
  }

  if (input.log) {
    return toFunctionLogger(input.log);
  }

  return createNoopLogger();
}
