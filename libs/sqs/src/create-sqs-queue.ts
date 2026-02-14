import { registerDefinedSqsListener } from "./register-defined-sqs-listener";
import { toListenerTarget } from "./to-listener-target";
import type {
  BoundSqsQueue,
  CreateSqsListenerInput,
  SqsClient,
  SqsMessage,
  SqsQueue,
  SqsQueueListener,
  SqsQueueRuntimeConfig,
} from "./types";

type Parser<TMessage extends SqsMessage> = {
  parse(input: unknown): TMessage;
};

type CreateSqsQueueOptions = {
  queueName: string;
};

function toQueueName(options: CreateSqsQueueOptions): string {
  const queueName = options.queueName.trim();
  if (queueName.length === 0) {
    throw new Error("queueName is required");
  }

  return queueName;
}

function toListenerId(queueName: string, providedListenerId: string | undefined): string {
  const source = providedListenerId?.trim() || `${queueName}_listener`;
  const normalized = source.replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_");
  if (normalized.length === 0) {
    throw new Error("listenerId is required");
  }

  return normalized;
}

function toRuntimeConfig(queueName: string): SqsQueueRuntimeConfig {
  return {
    kind: "sqs-queue",
    queueName,
  };
}

function bindQueue<TMessage extends SqsMessage>(
  sqs: SqsClient,
  queueName: string,
  parse: (input: unknown) => TMessage,
): BoundSqsQueue<TMessage> {
  return {
    async send(message: TMessage): Promise<TMessage> {
      const parsedMessage = parse(message);
      await sqs.send({
        message: parsedMessage,
        queueName,
      });
      return parsedMessage;
    },
  };
}

function addQueueListener<TMessage extends SqsMessage>(
  queueName: string,
  runtimeConfig: SqsQueueRuntimeConfig,
  parse: (input: unknown) => TMessage,
  input: CreateSqsListenerInput<TMessage>,
): SqsQueueListener<TMessage> {
  const listenerId = toListenerId(queueName, input.listenerId);
  const target = toListenerTarget(input.target);
  const hasHandler = typeof input.handler === "function";

  if (target.kind === "step-function" && hasHandler) {
    throw new Error("Step-function listeners must not define handlers");
  }

  if (target.kind !== "step-function" && !hasHandler) {
    throw new Error("Lambda listeners must define handlers");
  }

  const listener: SqsQueueListener<TMessage> = {
    ...(input.aws ? { aws: { ...input.aws } } : {}),
    ...(hasHandler ? { handler: input.handler } : {}),
    listenerId,
    parse,
    queue: {
      runtime: runtimeConfig,
    },
    target,
  };

  registerDefinedSqsListener({
    ...(listener.aws ? { aws: { ...listener.aws } } : {}),
    ...(listener.handler ? { handler: listener.handler } : {}),
    listenerId: listener.listenerId,
    parse: listener.parse,
    queue: listener.queue,
    target: listener.target,
  });

  return listener;
}

export function createSqsQueue<TMessage extends SqsMessage>(
  parser: Parser<TMessage>,
  options: CreateSqsQueueOptions,
): SqsQueue<TMessage> {
  const queueName = toQueueName(options);
  const runtimeConfig = toRuntimeConfig(queueName);

  return {
    addListener(input) {
      return addQueueListener(queueName, runtimeConfig, parser.parse.bind(parser), input);
    },
    bind(sqs) {
      return bindQueue(sqs, queueName, parser.parse.bind(parser));
    },
    parse(input: unknown): TMessage {
      return parser.parse(input);
    },
    queueName,
    runtimeConfig,
  };
}
