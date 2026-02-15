/** @fileoverview Implements define options. @module libs/http-api-contract/src/define-options */
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

type OptionsEndpointDefinition<
  TParams,
  TQuery,
  THeaders,
  TBody,
  TResponse,
  TDbAccess extends EndpointDbAccess,
  TContextInput extends EndpointContextInput | undefined,
  TPath extends string,
> = EndpointDefinition<TParams, TQuery, THeaders, TBody, TResponse, TDbAccess, TContextInput> & {
  method: "OPTIONS";
  path: TPath;
};

/** @example `defineOptions(input)` */ export function defineOptions<
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
): OptionsEndpointDefinition<
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
    method: "OPTIONS",
  }) as OptionsEndpointDefinition<
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
