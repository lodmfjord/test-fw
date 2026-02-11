import type { AwsDynamoDbOperations, CreateAwsDynamoDbInput, DynamoDbClient } from "./types";

type DynamoDbClientModule = {
  DynamoDBClient: new (
    input?: unknown,
  ) => {
    send(command: unknown): Promise<unknown>;
  };
  GetItemCommand: new (input: unknown) => unknown;
  DeleteItemCommand: new (input: unknown) => unknown;
  PutItemCommand: new (input: unknown) => unknown;
  UpdateItemCommand: new (input: unknown) => unknown;
};

type DynamoDbUtilModule = {
  marshall(input: Record<string, unknown>): Record<string, unknown>;
  unmarshall(input: Record<string, unknown>): Record<string, unknown>;
};

async function createDefaultOperations(): Promise<AwsDynamoDbOperations> {
  const dynamoClientModuleName = "@aws-sdk/client-dynamodb";
  const dynamoUtilModuleName = "@aws-sdk/util-dynamodb";

  try {
    const dynamoClientModule = (await import(dynamoClientModuleName)) as DynamoDbClientModule;
    const dynamoUtilModule = (await import(dynamoUtilModuleName)) as DynamoDbUtilModule;
    const client = new dynamoClientModule.DynamoDBClient({});

    return {
      async readItem(input) {
        const result = (await client.send(
          new dynamoClientModule.GetItemCommand({
            Key: dynamoUtilModule.marshall(input.key),
            TableName: input.tableName,
          }),
        )) as {
          Item?: Record<string, unknown>;
        };

        if (!result.Item) {
          return undefined;
        }

        return dynamoUtilModule.unmarshall(result.Item);
      },
      async removeItem(input) {
        await client.send(
          new dynamoClientModule.DeleteItemCommand({
            Key: dynamoUtilModule.marshall(input.key),
            TableName: input.tableName,
          }),
        );
      },
      async updateItem(input) {
        const changeEntries = Object.entries(input.changes);
        if (changeEntries.length === 0) {
          const currentItem = await client.send(
            new dynamoClientModule.GetItemCommand({
              Key: dynamoUtilModule.marshall(input.key),
              TableName: input.tableName,
            }),
          );
          const item = (currentItem as { Item?: Record<string, unknown> }).Item;
          return item ? dynamoUtilModule.unmarshall(item) : undefined;
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
          new dynamoClientModule.UpdateItemCommand({
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: dynamoUtilModule.marshall(expressionAttributeValuesSource),
            Key: dynamoUtilModule.marshall(input.key),
            ReturnValues: "ALL_NEW",
            TableName: input.tableName,
            UpdateExpression: `SET ${assignments.join(", ")}`,
          }),
        );

        const nextItem = (updateResult as { Attributes?: Record<string, unknown> }).Attributes;
        return nextItem ? dynamoUtilModule.unmarshall(nextItem) : undefined;
      },
      async writeItem(input) {
        await client.send(
          new dynamoClientModule.PutItemCommand({
            Item: dynamoUtilModule.marshall(input.item),
            TableName: input.tableName,
          }),
        );
      },
    };
  } catch {
    throw new Error(
      "AWS DynamoDB SDK modules are required in Lambda runtime. Install @aws-sdk/client-dynamodb and @aws-sdk/util-dynamodb.",
    );
  }
}

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
