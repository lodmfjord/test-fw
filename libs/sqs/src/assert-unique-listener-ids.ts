import type { SqsListenerRuntimeDefinition } from "./types";

export function assertUniqueListenerIds(
  listeners: ReadonlyArray<SqsListenerRuntimeDefinition>,
): void {
  const seen = new Set<string>();

  for (const listener of listeners) {
    if (seen.has(listener.listenerId)) {
      throw new Error(`SQS listener ID collision: "${listener.listenerId}"`);
    }

    seen.add(listener.listenerId);
  }
}
