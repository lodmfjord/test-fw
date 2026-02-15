/**
 * @fileoverview Implements to sqs listeners by id.
 */
import type { SqsListenerRuntimeDefinition } from "@babbstack/sqs";

type LambdaSqsListenerConfig = {
  batch_size: number;
  memory_mb: number;
  queue_key: string;
  queue_name: string;
  timeout_seconds: number;
};

/** Converts values to queue key. */
function toQueueKey(queueName: string): string {
  return queueName.replace(/[^a-zA-Z0-9_]/g, "_");
}

/**
 * Converts values to sqs listeners by id.
 * @param listeners - Listeners parameter.
 * @example
 * toSqsListenersById(listeners)
 */
export function toSqsListenersById(
  listeners: ReadonlyArray<SqsListenerRuntimeDefinition>,
): Record<string, LambdaSqsListenerConfig> {
  const sortedListeners = listeners
    .filter((listener) => listener.target?.kind !== "step-function")
    .sort((left, right) => left.listenerId.localeCompare(right.listenerId));

  return Object.fromEntries(
    sortedListeners.map((listener) => [
      listener.listenerId,
      {
        batch_size: listener.aws?.batchSize ?? 10,
        memory_mb: listener.aws?.memoryMb ?? 256,
        queue_key: toQueueKey(listener.queue.runtime.queueName),
        queue_name: listener.queue.runtime.queueName,
        timeout_seconds: listener.aws?.timeoutSeconds ?? 15,
      },
    ]),
  );
}
