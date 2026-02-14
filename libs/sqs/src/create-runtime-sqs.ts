import { createAwsSqs } from "./create-aws-sqs";
import { createMemorySqs } from "./create-memory-sqs";
import type { CreateRuntimeSqsInput, SqsClient } from "./types";

function detectLambdaRuntime(): boolean {
  if (typeof process === "undefined" || !process.env) {
    return false;
  }

  return Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME ?? process.env.LAMBDA_TASK_ROOT);
}

export function createRuntimeSqs(input: CreateRuntimeSqsInput = {}): SqsClient {
  const createAwsRuntimeSqs = input.createAwsSqs ?? (() => createAwsSqs());
  const createMemoryRuntimeSqs = input.createMemorySqs ?? createMemorySqs;
  const isLambdaRuntime = input.isLambdaRuntime ?? detectLambdaRuntime();
  let sqsPromise: Promise<SqsClient> | undefined;

  const getSqs = async (): Promise<SqsClient> => {
    if (!sqsPromise) {
      sqsPromise = Promise.resolve(
        isLambdaRuntime ? createAwsRuntimeSqs() : createMemoryRuntimeSqs(),
      );
    }

    return sqsPromise;
  };

  return {
    async receive(receiveInput) {
      const sqs = await getSqs();
      return sqs.receive(receiveInput);
    },
    async remove(removeInput) {
      const sqs = await getSqs();
      await sqs.remove(removeInput);
    },
    async send(sendInput) {
      const sqs = await getSqs();
      await sqs.send(sendInput);
    },
  };
}
