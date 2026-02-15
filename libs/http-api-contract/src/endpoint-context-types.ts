/**
 * @fileoverview Implements endpoint context types.
 */
import type {
  DynamoDatabase,
  DynamoDatabaseRuntimeConfig,
  DynamoDbClient,
  DynamoDbItem,
  ReadBoundDynamoDatabase,
  WriteBoundDynamoDatabase,
} from "@babbstack/dynamodb";
import type { BoundSqsQueue, SqsMessage, SqsQueue, SqsQueueRuntimeConfig } from "@babbstack/sqs";

export type EndpointDbAccess = "read" | "write";

export type EndpointAccess<TDbAccess extends EndpointDbAccess = EndpointDbAccess> = {
  db: TDbAccess;
};

type EndpointDbClient<TDbAccess extends EndpointDbAccess> = TDbAccess extends "read"
  ? Pick<DynamoDbClient, "read">
  : DynamoDbClient;

type EndpointDatabaseAccessInput = ReadonlyArray<EndpointDbAccess> | undefined;

type EndpointContextDatabaseAccessMode<TAccess extends EndpointDatabaseAccessInput> =
  TAccess extends ReadonlyArray<EndpointDbAccess>
    ? "write" extends TAccess[number]
      ? "write"
      : "read"
    : "write";

type EndpointContextDatabaseValue<
  TItem extends DynamoDbItem,
  TKeyField extends keyof TItem & string,
  TAccess extends EndpointDatabaseAccessInput,
> =
  EndpointContextDatabaseAccessMode<TAccess> extends "write"
    ? WriteBoundDynamoDatabase<TItem, TKeyField>
    : ReadBoundDynamoDatabase<TItem, TKeyField>;

export type EndpointContextDatabaseInput = {
  access?: EndpointDatabaseAccessInput;
  handler: DynamoDatabase<DynamoDbItem, keyof DynamoDbItem & string>;
};

export type EndpointContextSqsInput = {
  handler: SqsQueue<SqsMessage>;
};

export type EndpointContextInput = {
  database?: EndpointContextDatabaseInput;
  sqs?: EndpointContextSqsInput;
};

type ResolvedEndpointContextDatabase<TContextInput extends EndpointContextInput | undefined> =
  TContextInput extends {
    database: EndpointContextDatabaseInput;
  }
    ? TContextInput["database"] extends EndpointContextDatabaseInput
      ? TContextInput["database"]["handler"] extends DynamoDatabase<infer TItem, infer TKeyField>
        ? EndpointContextDatabaseValue<TItem, TKeyField, TContextInput["database"]["access"]>
        : undefined
      : undefined
    : undefined;

type ResolvedEndpointContextSqs<TContextInput extends EndpointContextInput | undefined> =
  TContextInput extends {
    sqs: EndpointContextSqsInput;
  }
    ? TContextInput["sqs"] extends EndpointContextSqsInput
      ? TContextInput["sqs"]["handler"] extends SqsQueue<infer TMessage>
        ? BoundSqsQueue<TMessage>
        : undefined
      : undefined
    : undefined;

export type EndpointRuntimeContextDatabase = {
  access: EndpointDbAccess[];
  runtime: DynamoDatabaseRuntimeConfig<string>;
};

export type EndpointRuntimeContextSqs = {
  runtime: SqsQueueRuntimeConfig;
};

export type EndpointRuntimeContext = {
  database?: EndpointRuntimeContextDatabase;
  sqs?: EndpointRuntimeContextSqs;
};

export type EndpointContext<
  TParams,
  TQuery,
  THeaders,
  TBody,
  TDbAccess extends EndpointDbAccess = "write",
  TContextInput extends EndpointContextInput | undefined = undefined,
> = {
  body: TBody;
  database: ResolvedEndpointContextDatabase<TContextInput>;
  db: EndpointDbClient<TDbAccess>;
  headers: THeaders;
  params: TParams;
  query: TQuery;
  request: Request;
  sqs: ResolvedEndpointContextSqs<TContextInput>;
};
