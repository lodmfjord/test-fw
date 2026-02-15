/**
 * @fileoverview Implements create memory sqs.
 */
import type {
  SqsClient,
  SqsMessage,
  SqsReceivedMessage,
  SqsReceiveInput,
  SqsSendInput,
} from "./types";

type StoredMessage = {
  message: SqsMessage;
  receiptHandle: string;
};

/** Converts to queue name. */
function toQueueName(queueName: string): string {
  const normalized = queueName.trim();
  if (normalized.length === 0) {
    throw new Error("queueName is required");
  }

  return normalized;
}

/** Converts to max messages. */
function toMaxMessages(input: SqsReceiveInput): number {
  const value = input.maxMessages ?? 10;
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("maxMessages must be a positive integer");
  }

  return value;
}

/** Runs clone message. */
function cloneMessage(message: SqsMessage): SqsMessage {
  return structuredClone(message);
}

/** Converts to stored message. */
function toStoredMessage(input: SqsSendInput, receiptHandle: string): StoredMessage {
  return {
    message: cloneMessage(input.message),
    receiptHandle,
  };
}

/** Converts to received message. */
function toReceivedMessage(message: StoredMessage): SqsReceivedMessage {
  return {
    message: cloneMessage(message.message),
    receiptHandle: message.receiptHandle,
  };
}

/**
 * Creates memory sqs.
 * @example
 * createMemorySqs()
 * @returns Output value.
 */
export function createMemorySqs(): SqsClient {
  const store = new Map<string, StoredMessage[]>();
  let receiptIndex = 0;

  return {
    async receive(input) {
      const queueName = toQueueName(input.queueName);
      const maxMessages = toMaxMessages(input);
      const queueMessages = store.get(queueName) ?? [];
      return queueMessages.slice(0, maxMessages).map((message) => toReceivedMessage(message));
    },
    async remove(input) {
      const queueName = toQueueName(input.queueName);
      const receiptHandle = input.receiptHandle.trim();
      if (receiptHandle.length === 0) {
        throw new Error("receiptHandle is required");
      }

      const queueMessages = store.get(queueName) ?? [];
      const nextMessages = queueMessages.filter((entry) => entry.receiptHandle !== receiptHandle);
      store.set(queueName, nextMessages);
    },
    async send(input) {
      const queueName = toQueueName(input.queueName);
      const queueMessages = store.get(queueName) ?? [];
      receiptIndex += 1;
      const nextMessage = toStoredMessage(input, `${queueName}-receipt-${receiptIndex}`);
      store.set(queueName, [...queueMessages, nextMessage]);
    },
  };
}
