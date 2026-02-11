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

export function definePut<
  TParams,
  TQuery,
  THeaders,
  TBody,
  TResponse,
  TDbAccess extends EndpointDbAccess = "write",
  TContextInput extends EndpointContextInput | undefined = undefined,
>(
  input: WithoutMethod<TParams, TQuery, THeaders, TBody, TResponse, TDbAccess, TContextInput>,
): EndpointDefinition<TParams, TQuery, THeaders, TBody, TResponse, TDbAccess, TContextInput> {
  return defineEndpoint({
    ...input,
    method: "PUT",
  });
}
