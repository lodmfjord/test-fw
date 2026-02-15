/**
 * @fileoverview Implements define patch.
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

type PatchEndpointDefinition<
  TParams,
  TQuery,
  THeaders,
  TBody,
  TResponse,
  TDbAccess extends EndpointDbAccess,
  TContextInput extends EndpointContextInput | undefined,
  TPath extends string,
> = EndpointDefinition<TParams, TQuery, THeaders, TBody, TResponse, TDbAccess, TContextInput> & {
  method: "PATCH";
  path: TPath;
};

/**
 * Defines patch.
 * @param input - Input parameter.
 * @example
 * definePatch(input)
 * @returns Output value.
 */ export function definePatch<
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
): PatchEndpointDefinition<
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
    method: "PATCH",
  }) as PatchEndpointDefinition<
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
