import { sqsListenerRegistry } from "./sqs-listener-registry-store";

export function resetDefinedSqsListeners(): void {
  sqsListenerRegistry.length = 0;
}
