/**
 * @fileoverview Implements define head.
 */
import { defineEndpoint } from "./define-endpoint";
import type {
  EndpointContextInput,
  EndpointDbAccess,
  EndpointDefinition,
  EndpointInput,
} from "./types";

type WithoutMethod<
  TParams,
  TQuery,
  THeaders,
  TBody,
  TResponse,
  TDbAccess extends EndpointDbAccess,
  TContextInput extends EndpointContextInput | undefined,
> = Omit<
  EndpointInput<TParams, TQuery, THeaders, TBody, TResponse, TDbAccess, TContextInput>,
  "method"
>;

type HeadEndpointDefinition<
  TParams,
  TQuery,
  THeaders,
  TBody,
  TResponse,
  TDbAccess extends EndpointDbAccess,
  TContextInput extends EndpointContextInput | undefined,
  TPath extends string,
> = EndpointDefinition<TParams, TQuery, THeaders, TBody, TResponse, TDbAccess, TContextInput> & {
  method: "HEAD";
  path: TPath;
};

/**
 * Defines head.
 * @param input - Input parameter.
 * @example
 * defineHead(input)
 * @returns Output value.
 */ export function defineHead<
  TParams,
  TQuery,
  THeaders,
  TBody,
  TResponse,
  TDbAccess extends EndpointDbAccess = "write",
  TContextInput extends EndpointContextInput | undefined = undefined,
  TPath extends string = string,
>(
  input: WithoutMethod<TParams, TQuery, THeaders, TBody, TResponse, TDbAccess, TContextInput> & {
    path: TPath;
  },
): HeadEndpointDefinition<
  TParams,
  TQuery,
  THeaders,
  TBody,
  TResponse,
  TDbAccess,
  TContextInput,
  TPath
> {
  return defineEndpoint({
    ...input,
    method: "HEAD",
  }) as HeadEndpointDefinition<
    TParams,
    TQuery,
    THeaders,
    TBody,
    TResponse,
    TDbAccess,
    TContextInput,
    TPath
  >;
}
