/**
 * @fileoverview Implements to request correlation id.
 */
/** Converts to generated request id. */
function toGeneratedRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Converts to request correlation id.
 * @param request - Request parameter.
 * @example
 * toRequestCorrelationId(request)
 * @returns Output value.
 */
export function toRequestCorrelationId(request: Request): string {
  const providedRequestId = request.headers.get("x-request-id")?.trim();
  if (providedRequestId && providedRequestId.length > 0) {
    return providedRequestId;
  }

  return toGeneratedRequestId();
}
