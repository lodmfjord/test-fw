/**
 * @fileoverview Implements create aws s3.
 */
import { createDefaultAwsS3Operations } from "./create-default-aws-s3-operations";
import type { CreateAwsS3Input, S3Client } from "./types";

/**
 * Creates aws s3.
 * @param input - Input parameter.
 * @example
 * createAwsS3(input)
 * @returns Output value.
 */
export function createAwsS3(input: CreateAwsS3Input = {}): S3Client {
  const operationsPromise = input.operations
    ? Promise.resolve(input.operations)
    : createDefaultAwsS3Operations();

  return {
    async createSecureLink(secureLinkInput) {
      const operations = await operationsPromise;
      return operations.createSecureLink(secureLinkInput);
    },
    async get(getInput) {
      const operations = await operationsPromise;
      return operations.getObject(getInput);
    },
    async list(listInput) {
      const operations = await operationsPromise;
      return operations.listObjects(listInput);
    },
    async put(putInput) {
      const operations = await operationsPromise;
      return operations.putObject(putInput);
    },
    async remove(removeInput) {
      const operations = await operationsPromise;
      await operations.removeObject(removeInput);
    },
  };
}
