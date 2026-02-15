/**
 * @fileoverview Implements create aws dynamo db.
 */
import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  type AttributeValue,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { NativeAttributeValue } from "@aws-sdk/util-dynamodb";
import type { AwsDynamoDbOperations, CreateAwsDynamoDbInput, DynamoDbClient } from "./types";

/** Converts to marshall record. */
function toMarshallRecord(input: Record<string, unknown>): Record<string, NativeAttributeValue> {
  return input as Record<string, NativeAttributeValue>;
}

/** Creates default operations. */
async function createDefaultOperations(): Promise<AwsDynamoDbOperations> {
  const client = new DynamoDBClient({});

  return {
    async readItem(input) {
      const result = (await client.send(
        new GetItemCommand({
          Key: marshall(toMarshallRecord(input.key)),
          TableName: input.tableName,
        }),
      )) as {
        Item?: Record<string, AttributeValue>;
      };

      if (!result.Item) {
        return undefined;
      }

      return unmarshall(result.Item);
    },
    async removeItem(input) {
      await client.send(
        new DeleteItemCommand({
          Key: marshall(toMarshallRecord(input.key)),
          TableName: input.tableName,
        }),
      );
    },
    async updateItem(input) {
      const changeEntries = Object.entries(input.changes);
      if (changeEntries.length === 0) {
        const currentItem = await client.send(
          new GetItemCommand({
            Key: marshall(toMarshallRecord(input.key)),
            TableName: input.tableName,
          }),
        );
        const item = (currentItem as { Item?: Record<string, AttributeValue> }).Item;
        return item ? unmarshall(item) : undefined;
      }

      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValuesSource: Record<string, unknown> = {};
      const assignments: string[] = [];

      for (const [index, [attributeName, attributeValue]] of changeEntries.entries()) {
        const nameKey = `#n${index}`;
        const valueKey = `:v${index}`;
        expressionAttributeNames[nameKey] = attributeName;
        expressionAttributeValuesSource[valueKey] = attributeValue;
        assignments.push(`${nameKey} = ${valueKey}`);
      }

      const updateResult = await client.send(
        new UpdateItemCommand({
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: marshall(toMarshallRecord(expressionAttributeValuesSource)),
          Key: marshall(toMarshallRecord(input.key)),
          ReturnValues: "ALL_NEW",
          TableName: input.tableName,
          UpdateExpression: `SET ${assignments.join(", ")}`,
        }),
      );

      const nextItem = (updateResult as { Attributes?: Record<string, AttributeValue> }).Attributes;
      return nextItem ? unmarshall(nextItem) : undefined;
    },
    async writeItem(input) {
      await client.send(
        new PutItemCommand({
          Item: marshall(toMarshallRecord(input.item)),
          TableName: input.tableName,
        }),
      );
    },
  };
}

/**
 * Creates aws dynamo db.
 * @param input - Input parameter.
 * @example
 * createAwsDynamoDb(input)
 * @returns Output value.
 */
export function createAwsDynamoDb(input: CreateAwsDynamoDbInput = {}): DynamoDbClient {
  const operationsPromise = input.operations
    ? Promise.resolve(input.operations)
    : createDefaultOperations();

  return {
    async read(readInput) {
      const operations = await operationsPromise;
      return operations.readItem(readInput);
    },
    async remove(removeInput) {
      const operations = await operationsPromise;
      await operations.removeItem(removeInput);
    },
    async update(updateInput) {
      const operations = await operationsPromise;
      return operations.updateItem(updateInput);
    },
    async write(writeInput) {
      const operations = await operationsPromise;
      await operations.writeItem({
        item: {
          ...writeInput.item,
          ...writeInput.key,
        },
        tableName: writeInput.tableName,
      });
    },
  };
}
