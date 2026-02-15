/** @fileoverview Implements to sqs queues. @module libs/http-api-contract/src/to-sqs-queues */
import type { SqsListenerRuntimeDefinition } from "@babbstack/sqs";
import type { EndpointRuntimeDefinition } from "./types";

/** Converts values to queue key. */
function toQueueKey(queueName: string): string {
  return queueName.replace(/[^a-zA-Z0-9_]/g, "_");
}

/** Converts values to sqs queues. @example `toSqsQueues(input)` */
export function toSqsQueues(
  endpoints: ReadonlyArray<EndpointRuntimeDefinition>,
  listeners: ReadonlyArray<SqsListenerRuntimeDefinition>,
): Record<string, { name: string }> {
  const queueNames = new Set<string>();

  for (const endpoint of endpoints) {
    const queueName = endpoint.context?.sqs?.runtime.queueName;
    if (queueName) {
      queueNames.add(queueName);
    }
  }

  for (const listener of listeners) {
    queueNames.add(listener.queue.runtime.queueName);
  }

  const entries = [...queueNames].sort((left, right) => left.localeCompare(right));
  const result: Record<string, { name: string }> = {};
  for (const queueName of entries) {
    result[toQueueKey(queueName)] = {
      name: queueName,
    };
  }

  return result;
}
