/**
 * @fileoverview Implements create runtime dynamo db.
 */
import { createAwsDynamoDb } from "./create-aws-dynamo-db";
import { createMemoryDynamoDb } from "./create-memory-dynamo-db";
import type { CreateRuntimeDynamoDbInput, DynamoDbClient } from "./types";

/** Runs detect lambda runtime. */
function detectLambdaRuntime(): boolean {
  if (typeof process === "undefined" || !process.env) {
    return false;
  }

  return Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME ?? process.env.LAMBDA_TASK_ROOT);
}

/**
 * Creates runtime dynamo db.
 * @param input - Input parameter.
 * @example
 * createRuntimeDynamoDb(input)
 * @returns Output value.
 */
export function createRuntimeDynamoDb(input: CreateRuntimeDynamoDbInput = {}): DynamoDbClient {
  const createAwsDb = input.createAwsDb ?? (() => createAwsDynamoDb());
  const createMemoryDb = input.createMemoryDb ?? createMemoryDynamoDb;
  const isLambdaRuntime = input.isLambdaRuntime ?? detectLambdaRuntime();
  let dbPromise: Promise<DynamoDbClient> | undefined;

  /** Runs get db. */ const getDb = async (): Promise<DynamoDbClient> => {
    if (!dbPromise) {
      dbPromise = Promise.resolve(isLambdaRuntime ? createAwsDb() : createMemoryDb());
    }

    return dbPromise;
  };

  return {
    async read(readInput) {
      const db = await getDb();
      return db.read(readInput);
    },
    async remove(removeInput) {
      const db = await getDb();
      await db.remove(removeInput);
    },
    async update(updateInput) {
      const db = await getDb();
      return db.update(updateInput);
    },
    async write(writeInput) {
      const db = await getDb();
      await db.write(writeInput);
    },
  };
}
