/**
 * @fileoverview Implements to sqs lambda metadata.
 */
import type { EndpointRuntimeDefinition } from "./types";

type LambdaSqsSendAccess = {
  actions: string[];
  queue_key: string;
  queue_name: string;
};

const SQS_SEND_ACTIONS = ["sqs:SendMessage"];

/** Converts values to queue key. */
function toQueueKey(queueName: string): string {
  return queueName.replace(/[^a-zA-Z0-9_]/g, "_");
}

/**
 * Converts values to route sqs send access.
 * @param endpoints - Endpoints parameter.
 * @example
 * toRouteSqsSendAccess(endpoints)
 */
export function toRouteSqsSendAccess(
  endpoints: ReadonlyArray<EndpointRuntimeDefinition>,
): Record<string, LambdaSqsSendAccess> {
  const accessByRoute = new Map<string, LambdaSqsSendAccess>();

  for (const endpoint of endpoints) {
    if (endpoint.execution?.kind === "step-function") {
      continue;
    }

    const runtime = endpoint.context?.sqs?.runtime;
    if (!runtime) {
      continue;
    }

    accessByRoute.set(endpoint.routeId, {
      actions: [...SQS_SEND_ACTIONS],
      queue_key: toQueueKey(runtime.queueName),
      queue_name: runtime.queueName,
    });
  }

  const sortedEntries = [...accessByRoute.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  );
  return Object.fromEntries(sortedEntries);
}
