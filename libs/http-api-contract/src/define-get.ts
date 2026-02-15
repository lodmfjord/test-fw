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

type GetEndpointDefinition<
  TParams,
  TQuery,
  THeaders,
  TBody,
  TResponse,
  TDbAccess extends EndpointDbAccess,
  TContextInput extends EndpointContextInput | undefined,
  TPath extends string,
> = EndpointDefinition<TParams, TQuery, THeaders, TBody, TResponse, TDbAccess, TContextInput> & {
  method: "GET";
  path: TPath;
};

export function defineGet<
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
): GetEndpointDefinition<
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
    method: "GET",
  }) as GetEndpointDefinition<
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
