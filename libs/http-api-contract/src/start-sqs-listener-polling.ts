/**
 * @fileoverview Implements start sqs listener polling.
 */
import type { Logger } from "@babbstack/logger";
import { runSqsQueueListener } from "@babbstack/sqs";
import type {
  SqsClient,
  SqsListenerRuntimeDefinition,
  SqsMessage,
  SqsQueueListener,
} from "@babbstack/sqs";

/**
 * Starts sqs listener polling.
 * @param listeners - Listeners parameter.
 * @param sqs - Sqs parameter.
 * @param pollMs - Poll milliseconds parameter.
 * @param logger - Logger parameter.
 * @example
 * startSqsListenerPolling(listeners, sqs, pollMs, logger)
 */
export function startSqsListenerPolling(
  listeners: ReadonlyArray<SqsListenerRuntimeDefinition>,
  sqs: SqsClient,
  pollMs: number,
  logger: Logger,
): void {
  if (listeners.length === 0) {
    return;
  }

  let isPolling = false;
  /** Runs poll. */ const poll = async (): Promise<void> => {
    if (isPolling) {
      return;
    }

    isPolling = true;
    try {
      for (const listener of listeners) {
        // unsafe-cast: invariant = listener runtime definitions are normalized to SqsQueueListener<SqsMessage>.
        const typedListener = listener as unknown as SqsQueueListener<SqsMessage>;
        const processed = await runSqsQueueListener(typedListener, sqs);
        if (processed > 0) {
          logger.info(
            `babbstack sqs listener ${listener.listenerId} processed ${processed} message(s)`,
          );
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown SQS listener error";
      logger.error(`babbstack sqs listener polling error: ${message}`);
    } finally {
      isPolling = false;
    }
  };

  const timer = setInterval(() => {
    void poll();
  }, pollMs);
  timer.unref?.();
  void poll();
  logger.info(
    `babbstack sqs listener polling started for ${listeners.length} listener(s) at ${pollMs}ms`,
  );
}
