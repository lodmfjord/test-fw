import type { EndpointHandlerOutput } from "./types";

function toOutputHeaders(headers: unknown): Record<string, string> | undefined {
  if (headers === undefined) {
    return undefined;
  }

  if (!headers || typeof headers !== "object" || Array.isArray(headers)) {
    throw new Error("Handler output headers must be an object with string values");
  }

  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value !== "string") {
      throw new Error("Handler output headers must be an object with string values");
    }

    normalized[key] = value;
  }

  return normalized;
}

export function toEndpointHandlerOutput(output: unknown): EndpointHandlerOutput<unknown> {
  if (!output || typeof output !== "object" || !("value" in output)) {
    throw new Error("Handler output must include value");
  }

  const typedOutput = output as {
    contentType?: unknown;
    headers?: unknown;
    statusCode?: unknown;
    value: unknown;
  };
  let statusCode = 200;
  if (typedOutput.statusCode !== undefined) {
    if (!Number.isInteger(typedOutput.statusCode)) {
      throw new Error("Handler output statusCode must be an integer");
    }

    statusCode = typedOutput.statusCode as number;
  }

  if (statusCode < 100 || statusCode > 599) {
    throw new Error("Handler output statusCode must be between 100 and 599");
  }

  let contentType: string | undefined;
  if (typedOutput.contentType !== undefined) {
    if (
      typeof typedOutput.contentType !== "string" ||
      typedOutput.contentType.trim().length === 0
    ) {
      throw new Error("Handler output contentType must be a non-empty string");
    }

    contentType = typedOutput.contentType.trim();
  }
  const headers = toOutputHeaders(typedOutput.headers);

  return {
    ...(contentType ? { contentType } : {}),
    ...(headers ? { headers } : {}),
    statusCode,
    value: typedOutput.value,
  };
}
