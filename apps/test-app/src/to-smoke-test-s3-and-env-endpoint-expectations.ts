/**
 * @fileoverview Builds deployed smoke-test expectations for env and S3 routes.
 */
import type { EndpointExpectation } from "./smoke-test-deployed-api-types";

const smokeS3ObjectBody = "hello from smoke test";
const smokeS3BucketName = "test-app-s3-demo";
const smokeS3ObjectKey = "smoke-test-object.txt";

/** Converts to query string. */
function toQueryString(parameters: Record<string, string>): string {
  return new URLSearchParams(parameters).toString();
}

/** Runs assert object. */
function assertObject(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(message);
  }

  return value as Record<string, unknown>;
}

/** Runs assert string value. */
function assertStringValue(value: unknown, message: string): string {
  if (typeof value !== "string") {
    throw new Error(message);
  }

  return value;
}

/** Runs assert number value. */
function assertNumberValue(value: unknown, message: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(message);
  }

  return value;
}

/**
 * Converts to env and S3 endpoint expectations.
 * @example
 * toSmokeTestS3AndEnvEndpointExpectations()
 * @returns Output value.
 */
export function toSmokeTestS3AndEnvEndpointExpectations(): EndpointExpectation[] {
  const endpointExpectations: EndpointExpectation[] = [
    {
      expectedStatusCode: 200,
      method: "GET",
      name: "last-update",
      path: "/last-update",
      validate(payload) {
        const parsed = assertObject(payload, "Expected /last-update response object");
        const time = assertStringValue(
          parsed.time,
          `Expected /last-update time string, received ${String(parsed.time)}`,
        );
        if (new Date(time).toISOString() !== time) {
          throw new Error(`Expected /last-update time ISO string, received ${time}`);
        }
      },
    },
    {
      expectedStatusCode: 200,
      method: "GET",
      name: "env-demo",
      path: "/env-demo",
      validate(payload) {
        const parsed = assertObject(payload, "Expected /env-demo response object");
        if (parsed.plain !== "plain-value-from-endpoint-override") {
          throw new Error(
            `Expected /env-demo plain override value, received ${String(parsed.plain)}`,
          );
        }
        assertStringValue(
          parsed.secret,
          `Expected /env-demo secret string, received ${String(parsed.secret)}`,
        );
      },
    },
    {
      body: {
        content: smokeS3ObjectBody,
        contentType: "text/plain",
        key: smokeS3ObjectKey,
      },
      expectedStatusCode: 200,
      method: "POST",
      name: "s3-put-file",
      path: "/s3-demo/files",
      validate(payload) {
        const parsed = assertObject(payload, "Expected /s3-demo/files POST response object");
        if (parsed.bucketName !== smokeS3BucketName || parsed.key !== smokeS3ObjectKey) {
          throw new Error("Expected /s3-demo/files POST to echo bucketName and key");
        }
        assertNumberValue(parsed.size, "Expected /s3-demo/files POST size number");
      },
    },
    {
      expectedStatusCode: 200,
      method: "GET",
      name: "s3-get-file",
      path: `/s3-demo/files?${toQueryString({
        key: smokeS3ObjectKey,
      })}`,
      validate(payload) {
        const parsed = assertObject(payload, "Expected /s3-demo/files GET response object");
        if (parsed.content !== smokeS3ObjectBody || parsed.key !== smokeS3ObjectKey) {
          throw new Error("Expected /s3-demo/files GET content and key to match uploaded object");
        }
      },
    },
    {
      expectedStatusCode: 200,
      method: "GET",
      name: "s3-get-file-raw",
      path: `/s3-demo/files/raw?${toQueryString({
        key: smokeS3ObjectKey,
      })}`,
      validate(payload) {
        const content = assertStringValue(
          payload,
          `Expected /s3-demo/files/raw response string, received ${String(payload)}`,
        );
        if (content !== smokeS3ObjectBody) {
          throw new Error("Expected /s3-demo/files/raw body to match uploaded object");
        }
      },
    },
    {
      expectedStatusCode: 200,
      method: "GET",
      name: "s3-list-files",
      path: `/s3-demo/files/list?${toQueryString({
        prefix: "smoke-test",
      })}`,
      validate(payload) {
        const parsed = assertObject(payload, "Expected /s3-demo/files/list response object");
        if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
          throw new Error("Expected /s3-demo/files/list items array with at least one entry");
        }
      },
    },
    {
      expectedStatusCode: 200,
      method: "GET",
      name: "s3-secure-link",
      path: `/s3-demo/secure-link?${toQueryString({
        key: smokeS3ObjectKey,
        operation: "get",
      })}`,
      validate(payload) {
        const parsed = assertObject(payload, "Expected /s3-demo/secure-link response object");
        const url = assertStringValue(
          parsed.url,
          `Expected /s3-demo/secure-link url string, received ${String(parsed.url)}`,
        );
        if (!url.startsWith("https://")) {
          throw new Error(`Expected /s3-demo/secure-link https url, received ${url}`);
        }
      },
    },
  ];
  return endpointExpectations;
}
