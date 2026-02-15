/**
 * @fileoverview Implements render lambda observability source.
 */
const LAMBDA_OBSERVABILITY_SUPPORT_SOURCE = `
/** Converts values to header value. */
function toHeaderValue(headers, name) {
  if (!headers || typeof headers !== "object") {
    return undefined;
  }

  const lookup = String(name).toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (String(key).toLowerCase() === lookup && typeof value === "string") {
      const normalized = value.trim();
      return normalized.length > 0 ? normalized : undefined;
    }
  }

  return undefined;
}

/** Converts values to generated request id. */
function toGeneratedRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "req-" + String(Date.now());
}

/** Converts values to request id. */
function toRequestId(event) {
  const headerRequestId = toHeaderValue(event?.headers, "x-request-id");
  if (headerRequestId) {
    return headerRequestId;
  }

  const contextRequestId = typeof event?.requestContext?.requestId === "string"
    ? event.requestContext.requestId.trim()
    : "";
  if (contextRequestId.length > 0) {
    return contextRequestId;
  }

  return toGeneratedRequestId();
}

/** Converts values to trace id. */
function toTraceId(event) {
  return toHeaderValue(event?.headers, "x-amzn-trace-id") ?? toHeaderValue(event?.headers, "x-trace-id");
}

/** Converts values to error metadata. */
function toErrorMetadata(error) {
  if (error instanceof Error) {
    return {
      errorMessage: error.message,
      errorName: error.name,
      ...(error.stack ? { errorStack: error.stack } : {})
    };
  }

  return {
    errorMessage: String(error),
    errorName: "UnknownError"
  };
}

/** Converts values to base log fields. */
function toBaseLogFields(context) {
  return {
    ...(context.awsRequestId ? { awsRequestId: context.awsRequestId } : {}),
    method: context.method,
    path: context.path,
    requestId: context.requestId,
    routeId: context.routeId,
    ...(context.traceId ? { traceId: context.traceId } : {})
  };
}

/** Handles emit structured log. */
function emitStructuredLog(level, eventName, context, details) {
  const payload = {
    ...toBaseLogFields(context),
    ...(details ?? {}),
    event: eventName,
    level,
    timestamp: new Date().toISOString()
  };

  if (level === "error") {
    console.error(payload);
    return;
  }

  if (level === "warn") {
    if (typeof console.warn === "function") {
      console.warn(payload);
      return;
    }
  }

  console.log(payload);
}

/** Creates invocation log context. */
function createInvocationLogContext(event, routeId, method, path) {
  return {
    awsRequestId: typeof event?.requestContext?.requestId === "string"
      ? event.requestContext.requestId.trim()
      : undefined,
    method,
    path,
    requestId: toRequestId(event),
    routeId,
    startTimeMs: Date.now(),
    traceId: toTraceId(event)
  };
}

/** Converts values to duration ms. */
function toDurationMs(context) {
  return Math.max(0, Date.now() - context.startTimeMs);
}

/** Handles log invocation start. */
function logInvocationStart(context) {
  emitStructuredLog("info", "lambda.invocation.start", context);
}

/** Handles log invocation complete. */
function logInvocationComplete(context, statusCode) {
  emitStructuredLog("info", "lambda.invocation.complete", context, {
    durationMs: toDurationMs(context),
    statusCode
  });
}

/** Handles log input validation failure. */
function logInputValidationFailure(context, error) {
  emitStructuredLog("warn", "lambda.validation.input_failed", context, {
    ...toErrorMetadata(error),
    durationMs: toDurationMs(context)
  });
}

/** Handles log handler failure. */
function logHandlerFailure(context, error) {
  emitStructuredLog("error", "lambda.handler.failed", context, {
    ...toErrorMetadata(error),
    durationMs: toDurationMs(context)
  });
}

/** Handles log output validation failure. */
function logOutputValidationFailure(context, error) {
  emitStructuredLog("error", "lambda.validation.output_failed", context, {
    ...toErrorMetadata(error),
    durationMs: toDurationMs(context)
  });
}
`;

/**
 * Converts values to lambda observability support source.
 * @example
 * toLambdaObservabilitySupportSource()
 */
export function toLambdaObservabilitySupportSource(): string {
  return LAMBDA_OBSERVABILITY_SUPPORT_SOURCE;
}
