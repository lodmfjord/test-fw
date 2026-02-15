import { createDynamoDatabase, type DynamoDbClient } from "@babbstack/dynamodb";
import type { EndpointRuntimeDefinition } from "./types";

type EndpointDb = DynamoDbClient | Pick<DynamoDbClient, "read">;

type EndpointDatabaseContext = {
  database: unknown | undefined;
  db: EndpointDb;
};

function toDbForEndpoint(db: DynamoDbClient, endpoint: EndpointRuntimeDefinition): EndpointDb {
  if (endpoint.access?.db === "read") {
    return {
      read: db.read.bind(db),
    };
  }

  return db;
}

function toDatabaseForEndpoint(
  db: DynamoDbClient,
  endpoint: EndpointRuntimeDefinition,
): unknown | undefined {
  const runtimeContext = endpoint.context?.database;
  if (!runtimeContext) {
    return undefined;
  }

  const scopedDb = runtimeContext.access.includes("write")
    ? db
    : {
        read: db.read.bind(db),
      };
  const parser = {
    parse(input: unknown): Record<string, unknown> {
      return input as Record<string, unknown>;
    },
  };
  const database = createDynamoDatabase(parser, runtimeContext.runtime.keyField, {
    tableName: runtimeContext.runtime.tableName,
  });
  return database.bind(scopedDb as EndpointDb);
}

export function toEndpointDatabaseContext(
  db: DynamoDbClient,
  endpoint: EndpointRuntimeDefinition,
): EndpointDatabaseContext {
  return {
    database: toDatabaseForEndpoint(db, endpoint),
    db: toDbForEndpoint(db, endpoint),
  };
}
