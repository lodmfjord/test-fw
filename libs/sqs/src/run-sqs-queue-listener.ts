import type { SqsClient, SqsMessage, SqsQueueListener } from "./types";

function toBatchSize(listener: SqsQueueListener<SqsMessage>): number {
  const value = listener.aws?.batchSize ?? 10;
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("listener aws.batchSize must be a positive integer");
  }

  return value;
}

export async function runSqsQueueListener<TMessage extends SqsMessage>(
  listener: SqsQueueListener<TMessage>,
  sqs: SqsClient,
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
    await listener.handler({
      message,
      request: {
        rawRecord: item,
      },
    });
    await sqs.remove({
      queueName,
      receiptHandle: item.receiptHandle,
    });
    processed += 1;
  }

  return processed;
}
