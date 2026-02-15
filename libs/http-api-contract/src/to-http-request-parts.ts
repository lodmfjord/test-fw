/**
 * @fileoverview Implements to http request parts.
 */
type HttpRequestParts = {
  headers: Record<string, string>;
  query: Record<string, string>;
};

/** Converts values to query. */
function toQuery(url: URL): Record<string, string> {
  const query: Record<string, string> = {};

  for (const [key, value] of url.searchParams.entries()) {
    query[key] = value;
  }

  return query;
}

/** Converts values to headers. */
function toHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of headers.entries()) {
    result[key.toLowerCase()] = value;
  }

  return result;
}

/**
 * Converts values to http request parts.
 * @param url - Url parameter.
 * @param headers - Headers parameter.
 * @example
 * toHttpRequestParts(url, headers)
 */
export function toHttpRequestParts(url: URL, headers: Headers): HttpRequestParts {
  return {
    headers: toHeaders(headers),
    query: toQuery(url),
  };
}
