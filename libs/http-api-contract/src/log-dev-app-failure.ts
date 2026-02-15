/** @fileoverview Implements log dev app failure. @module libs/http-api-contract/src/log-dev-app-failure */
type DevAppFailureEvent = "dev_app.handler_execution_failed" | "dev_app.output_validation_failed";

type LogDevAppFailureInput = {
  error: unknown;
  event: DevAppFailureEvent;
  method: string;
  path: string;
  requestId: string;
  routeId: string;
};

/** Converts values to error metadata. */
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

/** Handles log dev app failure. @example `logDevAppFailure(input)` */
export function logDevAppFailure(input: LogDevAppFailureInput): void {
  console.error({
    ...toErrorMetadata(input.error),
    event: input.event,
    method: input.method,
    path: input.path,
    requestId: input.requestId,
    routeId: input.routeId,
    timestamp: new Date().toISOString(),
  });
}
