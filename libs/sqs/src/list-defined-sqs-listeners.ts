/** @fileoverview Implements list defined sqs listeners. @module libs/sqs/src/list-defined-sqs-listeners */
import { sqsListenerRegistry } from "./sqs-listener-registry-store";
import type { SqsListenerRuntimeDefinition } from "./types";

/** Handles list defined sqs listeners. @example `listDefinedSqsListeners(input)` */
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
