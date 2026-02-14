import type { SqsClient, SqsMessage } from "@babbstack/sqs";
import type { EndpointRuntimeDefinition } from "./types";

export function toEndpointSqsContext(
  sqs: SqsClient,
  endpoint: EndpointRuntimeDefinition,
): unknown | undefined {
  const runtimeContext = endpoint.context?.sqs;
  if (!runtimeContext) {
    return undefined;
  }

  const queueNamePrefix =
    typeof process === "undefined" || !process.env
      ? ""
      : (process.env.SIMPLE_API_SQS_QUEUE_NAME_PREFIX ?? "");
  const queueName = `${queueNamePrefix}${runtimeContext.runtime.queueName}`;

  return {
    async send(message: SqsMessage): Promise<SqsMessage> {
      await sqs.send({
        message,
        queueName,
      });
      return message;
    },
  };
}
