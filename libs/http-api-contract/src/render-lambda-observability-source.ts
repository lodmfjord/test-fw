const LAMBDA_OBSERVABILITY_SUPPORT_SOURCE = `
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

function toGeneratedRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "req-" + String(Date.now());
}

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

function toTraceId(event) {
  return toHeaderValue(event?.headers, "x-amzn-trace-id") ?? toHeaderValue(event?.headers, "x-trace-id");
}

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

function toDurationMs(context) {
  return Math.max(0, Date.now() - context.startTimeMs);
}

function logInvocationStart(context) {
  emitStructuredLog("info", "lambda.invocation.start", context);
}

function logInvocationComplete(context, statusCode) {
  emitStructuredLog("info", "lambda.invocation.complete", context, {
    durationMs: toDurationMs(context),
    statusCode
  });
}

function logInputValidationFailure(context, error) {
  emitStructuredLog("warn", "lambda.validation.input_failed", context, {
    ...toErrorMetadata(error),
    durationMs: toDurationMs(context)
  });
}

function logHandlerFailure(context, error) {
  emitStructuredLog("error", "lambda.handler.failed", context, {
    ...toErrorMetadata(error),
    durationMs: toDurationMs(context)
  });
}

function logOutputValidationFailure(context, error) {
  emitStructuredLog("error", "lambda.validation.output_failed", context, {
    ...toErrorMetadata(error),
    durationMs: toDurationMs(context)
  });
}
`;

export function toLambdaObservabilitySupportSource(): string {
  return LAMBDA_OBSERVABILITY_SUPPORT_SOURCE;
}
