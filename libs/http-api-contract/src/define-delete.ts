/** @fileoverview Implements define delete. @module libs/http-api-contract/src/define-delete */
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

type DeleteEndpointDefinition<
  TParams,
  TQuery,
  THeaders,
  TBody,
  TResponse,
  TDbAccess extends EndpointDbAccess,
  TContextInput extends EndpointContextInput | undefined,
  TPath extends string,
> = EndpointDefinition<TParams, TQuery, THeaders, TBody, TResponse, TDbAccess, TContextInput> & {
  method: "DELETE";
  path: TPath;
};

/** @example `defineDelete(input)` */ export function defineDelete<
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
): DeleteEndpointDefinition<
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
    method: "DELETE",
  }) as DeleteEndpointDefinition<
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
