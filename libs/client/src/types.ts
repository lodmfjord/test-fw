/**
 * @fileoverview Implements types.
 */

type SchemaLike<TValue = unknown> = {
  optional?: boolean;
  parse(value: unknown, path?: string): TValue | undefined;
};

type EndpointRequestLike = {
  body?: SchemaLike<unknown>;
  headers?: SchemaLike<unknown>;
  params?: SchemaLike<unknown>;
  query?: SchemaLike<unknown>;
};

type AnyEndpoint = {
  method: string;
  path: string;
  request?: EndpointRequestLike;
  response: SchemaLike<unknown>;
  routeId: string;
};
type AnyRouteReference = {
  routeId: string;
};
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";

type FlattenEndpointDefinitions<TValue> =
  TValue extends ReadonlyArray<infer TItem>
    ? FlattenEndpointDefinitions<TItem>
    : TValue extends AnyEndpoint
      ? TValue
      : never;

export type ClientEndpointUnion<TEndpoints> = [FlattenEndpointDefinitions<TEndpoints>] extends [
  never,
]
  ? AnyEndpoint
  : FlattenEndpointDefinitions<TEndpoints>;

type FlattenRouteReferences<TValue> =
  TValue extends ReadonlyArray<infer TItem>
    ? FlattenRouteReferences<TItem>
    : TValue extends AnyRouteReference
      ? TValue
      : never;

type ClientRouteReferenceUnion<TRouteEndpoints> = [
  FlattenRouteReferences<TRouteEndpoints>,
] extends [never]
  ? AnyRouteReference
  : FlattenRouteReferences<TRouteEndpoints>;

type SchemaValue<TSchema> = TSchema extends {
  optional: true;
  parse: (value: unknown, path?: string) => infer TValue;
}
  ? Exclude<TValue, undefined>
  : TSchema extends {
        parse: (value: unknown, path?: string) => infer TValue;
      }
    ? TValue
    : unknown;

type EndpointParams<TEndpoint> = TEndpoint extends { request: { params?: infer TSchema } }
  ? SchemaValue<NonNullable<TSchema>>
  : unknown;

type EndpointQuery<TEndpoint> = TEndpoint extends { request: { query?: infer TSchema } }
  ? SchemaValue<NonNullable<TSchema>>
  : unknown;

type EndpointHeaders<TEndpoint> = TEndpoint extends { request: { headers?: infer TSchema } }
  ? SchemaValue<NonNullable<TSchema>>
  : unknown;

type EndpointBody<TEndpoint> = TEndpoint extends { request: { body?: infer TSchema } }
  ? SchemaValue<NonNullable<TSchema>>
  : unknown;

export type ClientEndpointResponse<TEndpoint> = TEndpoint extends { response: infer TSchema }
  ? SchemaValue<NonNullable<TSchema>>
  : unknown;

type IsUnknown<TValue> = unknown extends TValue
  ? [TValue] extends [unknown]
    ? true
    : false
  : false;

type ClientRequestParamsField<TEndpoint> =
  IsUnknown<EndpointParams<TEndpoint>> extends true
    ? {
        params?: Record<string, string | number | boolean | undefined>;
      }
    : {
        params: EndpointParams<TEndpoint>;
      };

export type ClientRequestInput<TEndpoint> = ClientRequestParamsField<TEndpoint> & {
  body?: EndpointBody<TEndpoint>;
  headers?: EndpointHeaders<TEndpoint>;
  query?: EndpointQuery<TEndpoint>;
  signal?: AbortSignal;
};

export type ClientResponse<TData> = {
  data: TData;
  headers: Record<string, string>;
  ok: boolean;
  statusCode: number;
};

type ClientRequestCore<TEndpoints> = <TEndpoint extends ClientEndpointUnion<TEndpoints>>(
  endpoint: TEndpoint,
  input: ClientRequestInput<TEndpoint>,
) => Promise<ClientResponse<ClientEndpointResponse<TEndpoint>>>;

type RouteIdForEndpoint<TEndpoint> = TEndpoint extends { routeId: infer TRouteId extends string }
  ? TRouteId
  : never;
type KnownLiteralString<TValue extends string> = string extends TValue ? never : TValue;

type EndpointByRouteId<TEndpoints, TRouteId extends string> = [
  Extract<ClientEndpointUnion<TEndpoints>, { routeId: TRouteId }>,
] extends [never]
  ? ClientEndpointUnion<TEndpoints>
  : Extract<ClientEndpointUnion<TEndpoints>, { routeId: TRouteId }>;

type RouteIdFromRequestEndpoints<TRouteEndpoints> = RouteIdForEndpoint<
  ClientRouteReferenceUnion<TRouteEndpoints>
>;
type KnownRouteIdFromRequestEndpoints<TRouteEndpoints> = KnownLiteralString<
  RouteIdFromRequestEndpoints<TRouteEndpoints>
>;
type RouteIdInput<TRouteEndpoints> = [KnownRouteIdFromRequestEndpoints<TRouteEndpoints>] extends [
  never,
]
  ? string
  : KnownRouteIdFromRequestEndpoints<TRouteEndpoints>;

type EndpointByMethod<TEndpoints, TMethod extends string> = [
  Extract<ClientEndpointUnion<TEndpoints>, { method: TMethod }>,
] extends [never]
  ? ClientEndpointUnion<TEndpoints>
  : Extract<ClientEndpointUnion<TEndpoints>, { method: TMethod }>;

type NormalizePathKey<TPath extends string> = TPath extends `/${string}` ? TPath : `/${TPath}`;
type PathAccessKey<TPath extends string> = TPath extends `/${infer TRest}` ? TPath | TRest : TPath;

type EndpointByMethodPath<TEndpoints, TMethod extends string, TPath extends string> = [
  Extract<EndpointByMethod<TEndpoints, TMethod>, { path: NormalizePathKey<TPath> }>,
] extends [never]
  ? EndpointByMethod<TEndpoints, TMethod>
  : Extract<EndpointByMethod<TEndpoints, TMethod>, { path: NormalizePathKey<TPath> }>;

type KnownPathByMethod<TEndpoints, TMethod extends string> = [
  EndpointByMethod<TEndpoints, TMethod> extends { path: infer TPath extends string }
    ? TPath
    : never,
] extends [never]
  ? string
  : EndpointByMethod<TEndpoints, TMethod> extends { path: infer TPath extends string }
    ? TPath
    : string;

type ClientRequestMethodPathApi<TEndpoints, TMethod extends HttpMethod> = {
  [TPath in PathAccessKey<KnownPathByMethod<TEndpoints, TMethod>>]: (
    input: ClientRequestInput<EndpointByMethodPath<TEndpoints, TMethod, TPath>>,
  ) => Promise<
    ClientResponse<ClientEndpointResponse<EndpointByMethodPath<TEndpoints, TMethod, TPath>>>
  >;
};

type ClientRequestByMethodApi<TEndpoints> = {
  [TMethod in HttpMethod]: ClientRequestMethodPathApi<TEndpoints, TMethod>;
};

type ClientRequestByRouteIdMethods<TEndpoints, TRouteEndpoints> = {
  [TRouteId in KnownRouteIdFromRequestEndpoints<TRouteEndpoints>]: (
    input: ClientRequestInput<EndpointByRouteId<TEndpoints, TRouteId>>,
  ) => Promise<ClientResponse<ClientEndpointResponse<EndpointByRouteId<TEndpoints, TRouteId>>>>;
};

export type ClientRequestApi<TEndpoints, TRouteEndpoints> = ClientRequestCore<TEndpoints> &
  ClientRequestByMethodApi<TEndpoints> &
  ClientRequestByRouteIdMethods<TEndpoints, TRouteEndpoints> & {
    byRouteId<TRouteId extends RouteIdInput<TRouteEndpoints>>(
      routeId: TRouteId,
      input: ClientRequestInput<EndpointByRouteId<TEndpoints, TRouteId>>,
    ): Promise<ClientResponse<ClientEndpointResponse<EndpointByRouteId<TEndpoints, TRouteId>>>>;
    endpoint: ClientRequestCore<TEndpoints>;
  };

export type HttpApiClient<TEndpoints, TRouteEndpoints = TEndpoints> = {
  request: ClientRequestApi<TEndpoints, TRouteEndpoints>;
};
