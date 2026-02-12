type HttpResponseParts = {
  body: string | Blob;
  contentType: string;
};

function isBufferValue(payload: unknown): payload is Buffer {
  return typeof Buffer !== "undefined" && Buffer.isBuffer(payload);
}

export function toHttpResponseParts(payload: unknown, contentType?: string): HttpResponseParts {
  const resolvedContentType =
    contentType ?? (isBufferValue(payload) ? "application/octet-stream" : "application/json");

  if (isBufferValue(payload)) {
    const bytes = Uint8Array.from(payload);
    return {
      body: new Blob([bytes]),
      contentType: resolvedContentType,
    };
  }

  const normalized = resolvedContentType.toLowerCase();
  return {
    body:
      normalized.includes("/json") || normalized.includes("+json")
        ? JSON.stringify(payload)
        : typeof payload === "string"
          ? payload
          : JSON.stringify(payload),
    contentType: resolvedContentType,
  };
}
