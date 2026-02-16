/**
 * @fileoverview Implements to http request parts.
 */
type HttpRequestParts = {
  headers: Record<string, string>;
  query: Record<string, string>;
};

/** Converts to query using API Gateway HTTP API payload format 2.0 semantics. */
function toQuery(url: URL): Record<string, string> {
  const query: Record<string, string> = {};

  for (const [key, value] of url.searchParams.entries()) {
    const existingValue = query[key];
    query[key] = existingValue === undefined ? value : `${existingValue},${value}`;
  }

  return query;
}

/** Converts to headers. */
function toHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of headers.entries()) {
    result[key.toLowerCase()] = value;
  }

  return result;
}

/**
 * Converts to http request parts.
 * @param url - Url parameter.
 * @param headers - Headers parameter.
 * @example
 * toHttpRequestParts(url, headers)
 * @returns Output value.
 */
export function toHttpRequestParts(url: URL, headers: Headers): HttpRequestParts {
  return {
    headers: toHeaders(headers),
    query: toQuery(url),
  };
}
