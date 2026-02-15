/**
 * @fileoverview Implements run sqs queue listener.
 */
import { executeStepFunctionDefinition } from "./execute-step-function-definition";
import type { RunSqsQueueListenerOptions, SqsClient, SqsMessage, SqsQueueListener } from "./types";

/** Converts to batch size. */
function toBatchSize(listener: SqsQueueListener<SqsMessage>): number {
  const value = listener.aws?.batchSize ?? 10;
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("listener aws.batchSize must be a positive integer");
  }

  return value;
}

/**
 * Runs sqs queue listener.
 * @param listener - Listener parameter.
 * @param sqs - Sqs parameter.
 * @param options - Options parameter.
 * @example
 * await runSqsQueueListener(listener, sqs, options)
 * @returns Output value.
 * @throws Error when operation fails.
 */ export async function runSqsQueueListener<TMessage extends SqsMessage>(
  listener: SqsQueueListener<TMessage>,
  sqs: SqsClient,
  options: RunSqsQueueListenerOptions = {},
): Promise<number> {
  const queueName = listener.queue.runtime.queueName;
  const maxMessages = toBatchSize(listener as SqsQueueListener<SqsMessage>);
  const batch = await sqs.receive({
    maxMessages,
    queueName,
  });

  let processed = 0;

  for (const item of batch) {
    const message = listener.parse(item.message);
    if (listener.target?.kind === "step-function") {
      if (listener.target.invocationType === "sync") {
        await executeStepFunctionDefinition(listener.target.definition, message, {
          ...(options.stepFunctionTaskHandlers
            ? { taskHandlers: options.stepFunctionTaskHandlers }
            : {}),
        });
      }
    } else {
      if (!listener.handler) {
        throw new Error("Missing handler for lambda listener");
      }

      await listener.handler({
        message,
        request: {
          rawRecord: item,
        },
      });
    }
    await sqs.remove({
      queueName,
      receiptHandle: item.receiptHandle,
    });
    processed += 1;
  }

  return processed;
}
