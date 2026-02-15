/** @fileoverview Implements reset defined sqs listeners. @module libs/sqs/src/reset-defined-sqs-listeners */
import { sqsListenerRegistry } from "./sqs-listener-registry-store";

/** Handles reset defined sqs listeners. @example `resetDefinedSqsListeners(input)` */
export function resetDefinedSqsListeners(): void {
  sqsListenerRegistry.length = 0;
}
