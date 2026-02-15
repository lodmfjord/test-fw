/**
 * @fileoverview Implements to dev app response.
 */
import { toHttpResponseParts } from "./to-http-response-parts";

/**
 * Converts values to dev app response.
 * @param status - Status parameter.
 * @param payload - Payload parameter.
 * @param contentType - Content type parameter.
 * @param headers - Headers parameter.
 * @param requestId - Request id parameter.
 * @example
 * toDevAppResponse(status, payload, contentType, headers, requestId)
 */
export function toDevAppResponse(
  status: number,
  payload: unknown,
  contentType?: string,
  headers?: Record<string, string>,
  requestId?: string,
): Response {
  const responseParts = toHttpResponseParts(payload, contentType);

  return new Response(responseParts.body, {
    headers: {
      ...(headers ?? {}),
      "content-type": responseParts.contentType,
      ...(requestId ? { "x-request-id": requestId } : {}),
    },
    status,
  });
}
