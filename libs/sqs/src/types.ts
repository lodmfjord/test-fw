export type SqsMessage = Record<string, unknown>;

export type SqsSendInput = {
  message: SqsMessage;
  queueName: string;
};

export type SqsReceiveInput = {
  maxMessages?: number;
  queueName: string;
};

export type SqsReceivedMessage = {
  message: SqsMessage;
  receiptHandle: string;
};

export type SqsRemoveInput = {
  queueName: string;
  receiptHandle: string;
};

export type SqsClient = {
  receive(input: SqsReceiveInput): Promise<SqsReceivedMessage[]>;
  remove(input: SqsRemoveInput): Promise<void>;
  send(input: SqsSendInput): Promise<void>;
};

export type AwsSqsOperations = {
  receiveMessages(input: SqsReceiveInput): Promise<SqsReceivedMessage[]>;
  removeMessage(input: SqsRemoveInput): Promise<void>;
  sendMessage(input: SqsSendInput): Promise<void>;
};

export type CreateAwsSqsInput = {
  operations?: AwsSqsOperations;
};

export type CreateRuntimeSqsInput = {
  createAwsSqs?: () => Promise<SqsClient> | SqsClient;
  createMemorySqs?: () => SqsClient;
  isLambdaRuntime?: boolean;
};

export type BoundSqsQueue<TMessage extends SqsMessage> = {
  send(message: TMessage): Promise<TMessage>;
};

export type SqsQueueRuntimeConfig = {
  kind: "sqs-queue";
  queueName: string;
};

export type SqsListenerAwsOptions = {
  batchSize?: number;
  memoryMb?: number;
  timeoutSeconds?: number;
};

export type SqsListenerRequest = {
  rawEvent?: unknown;
  rawRecord?: unknown;
};

export type SqsListenerHandler<TMessage extends SqsMessage> = {
  bivarianceHack(context: { message: TMessage; request: SqsListenerRequest }): Promise<void> | void;
}["bivarianceHack"];

export type CreateSqsListenerInput<TMessage extends SqsMessage> = {
  aws?: SqsListenerAwsOptions;
  handler: SqsListenerHandler<TMessage>;
  listenerId?: string;
};

export type SqsQueueListenerRuntime = {
  aws?: SqsListenerAwsOptions;
  listenerId: string;
  queue: {
    runtime: SqsQueueRuntimeConfig;
  };
};

export type SqsListenerRuntimeDefinition = SqsQueueListenerRuntime & {
  handler(context: { message: unknown; request: SqsListenerRequest }): Promise<void> | void;
  parse(input: unknown): unknown;
};

export type SqsQueueListener<TMessage extends SqsMessage> = SqsQueueListenerRuntime & {
  handler: SqsListenerHandler<TMessage>;
  parse(input: unknown): TMessage;
};

export type SqsQueue<TMessage extends SqsMessage> = {
  addListener(input: CreateSqsListenerInput<TMessage>): SqsQueueListener<TMessage>;
  bind(sqs: SqsClient): BoundSqsQueue<TMessage>;
  parse(input: unknown): TMessage;
  queueName: string;
  runtimeConfig: SqsQueueRuntimeConfig;
};
