/**
 * @fileoverview Implements create runtime s3.
 */
import { createAwsS3 } from "./create-aws-s3";
import { createMemoryS3 } from "./create-memory-s3";
import type { CreateRuntimeS3Input, S3Client } from "./types";

/** Handles detect lambda runtime. */
function detectLambdaRuntime(): boolean {
  if (typeof process === "undefined" || !process.env) {
    return false;
  }

  return Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME ?? process.env.LAMBDA_TASK_ROOT);
}

/**
 * Creates runtime s3.
 * @param input - Input parameter.
 * @example
 * createRuntimeS3(input)
 */
export function createRuntimeS3(input: CreateRuntimeS3Input = {}): S3Client {
  const createAwsRuntimeS3 = input.createAwsS3 ?? (() => createAwsS3());
  const createMemoryRuntimeS3 = input.createMemoryS3 ?? createMemoryS3;
  const isLambdaRuntime = input.isLambdaRuntime ?? detectLambdaRuntime();
  let s3Promise: Promise<S3Client> | undefined;

  /** Handles get s3. */ const getS3 = async (): Promise<S3Client> => {
    if (!s3Promise) {
      s3Promise = Promise.resolve(isLambdaRuntime ? createAwsRuntimeS3() : createMemoryRuntimeS3());
    }

    return s3Promise;
  };

  return {
    async createSecureLink(secureLinkInput) {
      const s3 = await getS3();
      return s3.createSecureLink(secureLinkInput);
    },
    async get(getInput) {
      const s3 = await getS3();
      return s3.get(getInput);
    },
    async list(listInput) {
      const s3 = await getS3();
      return s3.list(listInput);
    },
    async put(putInput) {
      const s3 = await getS3();
      return s3.put(putInput);
    },
    async remove(removeInput) {
      const s3 = await getS3();
      await s3.remove(removeInput);
    },
  };
}
