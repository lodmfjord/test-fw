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
import type { BoundS3Bucket, S3Bucket, S3BucketRuntimeConfig } from "@babbstack/s3";
import type { BoundSqsQueue, SqsMessage, SqsQueue, SqsQueueRuntimeConfig } from "@babbstack/sqs";

export type EndpointDbAccess = "read" | "write";
export type EndpointS3Access = "list" | "read" | "remove" | "write";

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

export type EndpointContextS3Input = {
  access?: ReadonlyArray<EndpointS3Access>;
  handler: S3Bucket;
};

export type EndpointContextInput = {
  database?: EndpointContextDatabaseInput;
  s3?: EndpointContextS3Input;
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

type ResolvedEndpointContextS3<TContextInput extends EndpointContextInput | undefined> =
  TContextInput extends {
    s3: EndpointContextS3Input;
  }
    ? TContextInput["s3"] extends EndpointContextS3Input
      ? TContextInput["s3"]["handler"] extends S3Bucket
        ? BoundS3Bucket
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

export type EndpointRuntimeContextS3 = {
  access: EndpointS3Access[];
  runtime: S3BucketRuntimeConfig;
};

export type EndpointRuntimeContext = {
  database?: EndpointRuntimeContextDatabase;
  s3?: EndpointRuntimeContextS3;
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
  s3: ResolvedEndpointContextS3<TContextInput>;
  sqs: ResolvedEndpointContextSqs<TContextInput>;
};
