/**
 * @fileoverview Implements types endpoint.
 */
import type { DynamoDbClient } from "@babbstack/dynamodb";
import type { Schema } from "@babbstack/schema";
import type { StepFunctionTaskHandler } from "@babbstack/step-functions";
import type { SqsClient } from "@babbstack/sqs";
import type {
  EndpointAccess,
  EndpointContext,
  EndpointContextInput,
  EndpointDbAccess,
  EndpointRuntimeContext,
} from "./endpoint-context-types";
import type { RouteExecutionInput } from "./route-execution-types";
import type { AwsRouteOptions, RouteAuth, RouteDefinition } from "./types-route";

export type EndpointRequest<TParams, TQuery, THeaders, TBody> = {
  body?: Schema<TBody>;
  headers?: Schema<THeaders>;
  params?: Schema<TParams>;
  query?: Schema<TQuery>;
};

export type CreateDevAppOptions = {
  db?: DynamoDbClient;
  sqs?: SqsClient;
  stepFunctionTaskHandlers?: Record<string, StepFunctionTaskHandler>;
};

export type EndpointHandler<
  TParams,
  TQuery,
  THeaders,
  TBody,
  TResponse,
  TDbAccess extends EndpointDbAccess = "write",
  TContextInput extends EndpointContextInput | undefined = undefined,
> = {
  bivarianceHack(
    context: EndpointContext<TParams, TQuery, THeaders, TBody, TDbAccess, TContextInput>,
  ): Promise<EndpointHandlerOutput<TResponse>> | EndpointHandlerOutput<TResponse>;
}["bivarianceHack"];
export type EndpointHandlerOutput<_TResponse> = {
  contentType?: string;
  headers?: Record<string, string>;
  statusCode?: number;
  value: unknown | Buffer;
};

export type EndpointInput<
  TParams,
  TQuery,
  THeaders,
  TBody,
  TResponse,
  TDbAccess extends EndpointDbAccess = "write",
  TContextInput extends EndpointContextInput | undefined = undefined,
> = {
  access?: EndpointAccess<TDbAccess>;
  auth?: RouteAuth;
  aws?: AwsRouteOptions;
  context?: TContextInput;
  description?: string;
  env?: Array<Record<string, string>>;
  execution?: RouteExecutionInput;
  handler?: EndpointHandler<TParams, TQuery, THeaders, TBody, TResponse, TDbAccess, TContextInput>;
  handlerId?: string;
  method: string;
  operationId?: string;
  path: string;
  request?: EndpointRequest<TParams, TQuery, THeaders, TBody>;
  response: Schema<TResponse>;
  responses?: Record<number, Schema<unknown>>;
  successStatusCode?: number;
  summary?: string;
  tags?: string[];
};

export type EndpointMetadata = Omit<RouteDefinition, "handler"> & {
  access?: EndpointAccess<EndpointDbAccess>;
  context?: EndpointRuntimeContext;
  handlerId: string;
  responseByStatusCode: Record<string, Schema<unknown>>;
  successStatusCode: number;
};

export type EndpointDefinition<
  TParams,
  TQuery,
  THeaders,
  TBody,
  TResponse,
  TDbAccess extends EndpointDbAccess = "write",
  TContextInput extends EndpointContextInput | undefined = undefined,
> = EndpointMetadata & {
  handler?: EndpointHandler<TParams, TQuery, THeaders, TBody, TResponse, TDbAccess, TContextInput>;
  request: EndpointRequest<TParams, TQuery, THeaders, TBody>;
  response: Schema<TResponse>;
};

export type EndpointContractDefinition = EndpointMetadata & {
  request: EndpointRequest<unknown, unknown, unknown, unknown>;
  response: Schema<unknown>;
};

export type EndpointRuntimeHandler = {
  bivarianceHack(context: unknown): Promise<unknown> | unknown;
}["bivarianceHack"];

export type EndpointRuntimeDefinition = EndpointContractDefinition & {
  handler?: EndpointRuntimeHandler;
};
