/** @fileoverview Implements to dev app response. @module libs/http-api-contract/src/to-dev-app-response */
import { toHttpResponseParts } from "./to-http-response-parts";

/** Converts values to dev app response. @example `toDevAppResponse(input)` */
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
