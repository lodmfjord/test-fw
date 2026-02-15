/**
 * @fileoverview Implements to s3 lambda metadata.
 */
import type { EndpointRuntimeDefinition, EndpointS3Access } from "./types";

type LambdaS3Access = {
  bucket_actions: string[];
  bucket_key: string;
  bucket_name: string;
  object_actions: string[];
};

const S3_OBJECT_ACTION_BY_ACCESS: Record<Exclude<EndpointS3Access, "list">, string> = {
  read: "s3:GetObject",
  remove: "s3:DeleteObject",
  write: "s3:PutObject",
};

/** Converts to bucket key. */
function toBucketKey(bucketName: string): string {
  return bucketName.replace(/[^a-zA-Z0-9_]/g, "_");
}

/** Converts to bucket actions. */
function toBucketActions(access: ReadonlyArray<EndpointS3Access>): string[] {
  if (!access.includes("list")) {
    return [];
  }

  return ["s3:ListBucket"];
}

/** Converts to object actions. */
function toObjectActions(access: ReadonlyArray<EndpointS3Access>): string[] {
  const actions = access
    .filter((value): value is Exclude<EndpointS3Access, "list"> => value !== "list")
    .map((value) => S3_OBJECT_ACTION_BY_ACCESS[value]);

  return [...new Set(actions)].sort((left, right) => left.localeCompare(right));
}

/**
 * Converts to route s3 access.
 * @param endpoints - Endpoints parameter.
 * @example
 * toRouteS3Access(endpoints)
 * @returns Output value.
 */
export function toRouteS3Access(
  endpoints: ReadonlyArray<EndpointRuntimeDefinition>,
): Record<string, LambdaS3Access> {
  const accessByRoute = new Map<string, LambdaS3Access>();

  for (const endpoint of endpoints) {
    if (endpoint.execution?.kind === "step-function") {
      continue;
    }

    const runtime = endpoint.context?.s3?.runtime;
    const access = endpoint.context?.s3?.access;
    if (!runtime || !access) {
      continue;
    }

    accessByRoute.set(endpoint.routeId, {
      bucket_actions: toBucketActions(access),
      bucket_key: toBucketKey(runtime.bucketName),
      bucket_name: runtime.bucketName,
      object_actions: toObjectActions(access),
    });
  }

  const sortedEntries = [...accessByRoute.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  );
  return Object.fromEntries(sortedEntries);
}
