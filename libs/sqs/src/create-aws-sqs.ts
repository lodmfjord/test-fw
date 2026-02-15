/**
 * @fileoverview Implements create aws sqs.
 */
import {
  DeleteMessageCommand,
  GetQueueUrlCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
import type {
  AwsSqsOperations,
  CreateAwsSqsInput,
  SqsClient,
  SqsMessage,
  SqsReceiveInput,
  SqsReceivedMessage,
  SqsRemoveInput,
  SqsSendInput,
} from "./types";

/** Converts to message body. */
function toMessageBody(message: SqsMessage): string {
  return JSON.stringify(message);
}

/** Converts to parsed body. */
function toParsedBody(body: string | undefined): SqsMessage {
  if (!body) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body) as unknown;
  } catch {
    throw new Error("SQS message body must be valid JSON");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("SQS message body must be a JSON object");
  }

  return parsed as SqsMessage;
}

/** Creates default operations. */
async function createDefaultOperations(): Promise<AwsSqsOperations> {
  const client = new SQSClient({});
  const queueUrlByName = new Map<string, string>();

  /** Runs get queue url. */ const getQueueUrl = async (queueName: string): Promise<string> => {
    const existing = queueUrlByName.get(queueName);
    if (existing) {
      return existing;
    }

    const result = await client.send(
      new GetQueueUrlCommand({
        QueueName: queueName,
      }),
    );
    const queueUrl = result.QueueUrl;
    if (!queueUrl) {
      throw new Error(`Queue URL not found for queueName: ${queueName}`);
    }

    queueUrlByName.set(queueName, queueUrl);
    return queueUrl;
  };

  return {
    async receiveMessages(input: SqsReceiveInput): Promise<SqsReceivedMessage[]> {
      const queueUrl = await getQueueUrl(input.queueName);
      const maxMessages = input.maxMessages ?? 10;
      const result = await client.send(
        new ReceiveMessageCommand({
          MaxNumberOfMessages: maxMessages,
          QueueUrl: queueUrl,
        }),
      );

      const messages = result.Messages ?? [];
      return messages
        .filter((entry) => Boolean(entry.ReceiptHandle))
        .map((entry) => ({
          message: toParsedBody(entry.Body),
          receiptHandle: String(entry.ReceiptHandle),
        }));
    },
    async removeMessage(input: SqsRemoveInput): Promise<void> {
      const queueUrl = await getQueueUrl(input.queueName);
      await client.send(
        new DeleteMessageCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: input.receiptHandle,
        }),
      );
    },
    async sendMessage(input: SqsSendInput): Promise<void> {
      const queueUrl = await getQueueUrl(input.queueName);
      await client.send(
        new SendMessageCommand({
          MessageBody: toMessageBody(input.message),
          QueueUrl: queueUrl,
        }),
      );
    },
  };
}

/**
 * Creates aws sqs.
 * @param input - Input parameter.
 * @example
 * createAwsSqs(input)
 * @returns Output value.
 */
export function createAwsSqs(input: CreateAwsSqsInput = {}): SqsClient {
  const operationsPromise = input.operations
    ? Promise.resolve(input.operations)
    : createDefaultOperations();

  return {
    async receive(receiveInput) {
      const operations = await operationsPromise;
      return operations.receiveMessages(receiveInput);
    },
    async remove(removeInput) {
      const operations = await operationsPromise;
      await operations.removeMessage(removeInput);
    },
    async send(sendInput) {
      const operations = await operationsPromise;
      await operations.sendMessage(sendInput);
    },
  };
}
