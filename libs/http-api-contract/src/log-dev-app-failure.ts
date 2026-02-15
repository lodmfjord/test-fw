/**
 * @fileoverview Implements log dev app failure.
 */
import { createNoopLogger } from "@babbstack/logger";
import type { Logger } from "@babbstack/logger";

type DevAppFailureEvent = "dev_app.handler_execution_failed" | "dev_app.output_validation_failed";

type LogDevAppFailureInput = {
  error: unknown;
  event: DevAppFailureEvent;
  logger?: Logger;
  method: string;
  path: string;
  requestId: string;
  routeId: string;
};

/** Converts to error metadata. */
function toErrorMetadata(error: unknown): {
  errorMessage: string;
  errorName: string;
  errorStack?: string;
} {
  if (error instanceof Error) {
    return {
      errorMessage: error.message,
      errorName: error.name,
      ...(error.stack ? { errorStack: error.stack } : {}),
    };
  }

  return {
    errorMessage: String(error),
    errorName: "UnknownError",
  };
}

/**
 * Runs log dev app failure.
 * @param input - Input parameter.
 * @example
 * logDevAppFailure(input)
 */
export function logDevAppFailure(input: LogDevAppFailureInput): void {
  const logger = input.logger ?? createNoopLogger();

  logger.error("dev app request failed", {
    ...toErrorMetadata(input.error),
    event: input.event,
    method: input.method,
    path: input.path,
    requestId: input.requestId,
    routeId: input.routeId,
    timestamp: new Date().toISOString(),
  });
}
