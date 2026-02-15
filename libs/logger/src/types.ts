/**
 * @fileoverview Implements logger types.
 */
import type { LogLevel } from "@aws-lambda-powertools/logger/types";

export type LoggerPayload = Error | Record<string, unknown>;

export type Logger = {
  debug(message: string, payload?: LoggerPayload): void;
  error(message: string, payload?: LoggerPayload): void;
  getPersistentKeys(): Record<string, unknown>;
  info(message: string, payload?: LoggerPayload): void;
  warn(message: string, payload?: LoggerPayload): void;
};

export type CreateLoggerInput = {
  logLevel?: LogLevel;
  persistentKeys?: Record<string, unknown>;
  sampleRateValue?: number;
  serviceName?: string;
};
