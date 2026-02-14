import { assertUniqueListenerIds } from "./assert-unique-listener-ids";
import { sqsListenerRegistry } from "./sqs-listener-registry-store";
import type { SqsListenerRuntimeDefinition } from "./types";

export function registerDefinedSqsListener(listener: SqsListenerRuntimeDefinition): void {
  const existingIndex = sqsListenerRegistry.findIndex((entry) => {
    return entry.listenerId === listener.listenerId;
  });

  const nextRegistry = [...sqsListenerRegistry];
  if (existingIndex >= 0) {
    nextRegistry[existingIndex] = listener;
  } else {
    nextRegistry.push(listener);
  }

  assertUniqueListenerIds(nextRegistry);

  if (existingIndex >= 0) {
    sqsListenerRegistry[existingIndex] = listener;
    return;
  }

  sqsListenerRegistry.push(listener);
}
