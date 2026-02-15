type HttpRequestParts = {
  headers: Record<string, string>;
  query: Record<string, string>;
};

function toQuery(url: URL): Record<string, string> {
  const query: Record<string, string> = {};

  for (const [key, value] of url.searchParams.entries()) {
    query[key] = value;
  }

  return query;
}

function toHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of headers.entries()) {
    result[key.toLowerCase()] = value;
  }

  return result;
}

export function toHttpRequestParts(url: URL, headers: Headers): HttpRequestParts {
  return {
    headers: toHeaders(headers),
    query: toQuery(url),
  };
}
