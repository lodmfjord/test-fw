import { sqsListenerRegistry } from "./sqs-listener-registry-store";
import type { SqsListenerRuntimeDefinition } from "./types";

export function listDefinedSqsListeners(): SqsListenerRuntimeDefinition[] {
  return sqsListenerRegistry.map((listener) => ({
    ...(listener.aws ? { aws: { ...listener.aws } } : {}),
    ...(listener.handler ? { handler: listener.handler } : {}),
    listenerId: listener.listenerId,
    parse: listener.parse,
    queue: {
      runtime: listener.queue.runtime,
    },
    target: listener.target,
  })) as SqsListenerRuntimeDefinition[];
}
