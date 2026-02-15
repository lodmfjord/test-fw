/**
 * @fileoverview Implements to endpoint s3 context.
 */
import { createBucket, type S3Client } from "@babbstack/s3";
import type { EndpointRuntimeDefinition, EndpointS3Access } from "./types";

/** Converts to has s3 access. */
function hasS3Access(access: ReadonlyArray<EndpointS3Access>, value: EndpointS3Access): boolean {
  return access.includes(value);
}

/** Converts to denied s3 access error. */
function toDeniedS3AccessError(value: EndpointS3Access): Error {
  return new Error(`S3 context does not allow ${value} access`);
}

/** Converts to scoped s3 client. */
function toScopedS3Client(s3: S3Client, access: ReadonlyArray<EndpointS3Access>): S3Client {
  return {
    async createSecureLink(input) {
      const operation = input.operation ?? "get";
      if (operation === "put" && !hasS3Access(access, "write")) {
        throw toDeniedS3AccessError("write");
      }

      if (operation === "get" && !hasS3Access(access, "read")) {
        throw toDeniedS3AccessError("read");
      }

      return s3.createSecureLink(input);
    },
    async get(input) {
      if (!hasS3Access(access, "read")) {
        throw toDeniedS3AccessError("read");
      }

      return s3.get(input);
    },
    async list(input) {
      if (!hasS3Access(access, "list")) {
        throw toDeniedS3AccessError("list");
      }

      return s3.list(input);
    },
    async put(input) {
      if (!hasS3Access(access, "write")) {
        throw toDeniedS3AccessError("write");
      }

      return s3.put(input);
    },
    async remove(input) {
      if (!hasS3Access(access, "remove")) {
        throw toDeniedS3AccessError("remove");
      }

      await s3.remove(input);
    },
  };
}

/**
 * Converts to endpoint s3 context.
 * @param s3 - S3 parameter.
 * @param endpoint - Endpoint parameter.
 * @example
 * toEndpointS3Context(s3, endpoint)
 * @returns Output value.
 */
export function toEndpointS3Context(
  s3: S3Client,
  endpoint: EndpointRuntimeDefinition,
): unknown | undefined {
  const runtimeContext = endpoint.context?.s3;
  if (!runtimeContext) {
    return undefined;
  }

  const bucketNamePrefix =
    typeof process === "undefined" || !process.env
      ? ""
      : (process.env.SIMPLE_API_S3_BUCKET_NAME_PREFIX ?? "");
  const scopedS3 = toScopedS3Client(s3, runtimeContext.access);

  return createBucket({
    createClient: () => scopedS3,
    name: `${bucketNamePrefix}${runtimeContext.runtime.bucketName}`,
  });
}
