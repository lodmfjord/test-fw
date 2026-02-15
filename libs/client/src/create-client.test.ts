import { afterEach, describe, expect, it } from "bun:test";
import { defineGet, definePost, schema } from "@babbstack/http-api-contract";
import { createClient } from "./create-client";

const getUserEndpoint = defineGet({
  path: "/users/{id}",
  request: {
    params: schema.object({
      id: schema.string(),
    }),
    query: schema.object({
      expand: schema.string(),
    }),
  },
  response: schema.object({
    id: schema.string(),
    name: schema.string(),
  }),
  handler: () => {
    return {
      value: {
        id: "user-1",
        name: "sam",
      },
    };
  },
});

const postUserEndpoint = definePost({
  path: "/users",
  request: {
    body: schema.object({
      name: schema.string(),
    }),
  },
  response: schema.object({
    id: schema.string(),
  }),
  handler: () => {
    return {
      statusCode: 201,
      value: {
        id: "generated-user",
      },
    };
  },
  successStatusCode: 201,
});

const testEndpoints = [[getUserEndpoint], [postUserEndpoint]] as const;

type Assert<TValue extends true> = TValue;

const typeSafeClient = createClient("https://api.example.com", testEndpoints);

function _assertClientTypes(): void {
  const typedGetRequest = typeSafeClient.request.endpoint(getUserEndpoint, {
    params: { id: "user-1" },
    query: { expand: "posts" },
  });
  type TypedGetResponse = Awaited<typeof typedGetRequest>;
  type _assertGetData = Assert<
    TypedGetResponse["data"] extends { id: string; name: string } ? true : false
  >;

  const typedPostRequest = typeSafeClient.request.endpoint(postUserEndpoint, {
    body: { name: "sam" },
  });
  type TypedPostResponse = Awaited<typeof typedPostRequest>;
  type _assertPostData = Assert<TypedPostResponse["data"] extends { id: string } ? true : false>;

  // @ts-expect-error path params must match endpoint request params type
  void typeSafeClient.request.endpoint(getUserEndpoint, { params: { id: 123 } });
  void typeSafeClient.request(
    postUserEndpoint,
    // @ts-expect-error body payload must match endpoint request body type
    { body: { name: 123 } },
  );
  const typedGetByPath = typeSafeClient.request.GET["users/{id}"]({
    params: { id: "user-1" },
    query: { expand: "posts" },
  });
  type TypedGetByPathResponse = Awaited<typeof typedGetByPath>;
  type _assertGetByPathData = Assert<
    TypedGetByPathResponse["data"] extends { id: string; name: string } ? true : false
  >;

  // @ts-expect-error GET path key must match a known GET endpoint path
  void typeSafeClient.request.GET["users/not-real"]({ params: { id: "user-1" } });
  // @ts-expect-error POST path key must match a known POST endpoint path
  void typeSafeClient.request.POST["users/{id}"]({ body: { name: "sam" } });
}

const originalFetch = globalThis.fetch;

type CapturedRequest = {
  init: RequestInit | BunFetchRequestInit | undefined;
  url: string;
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("createClient", () => {
  it("sends method and path params and query params from endpoint metadata", async () => {
    const requests: CapturedRequest[] = [];
    globalThis.fetch = (async (input, init) => {
      requests.push({
        init,
        url: String(input),
      });
      return new Response(
        JSON.stringify({
          id: "user-1",
          name: "sam",
        }),
        {
          headers: {
            "content-type": "application/json",
            "x-request-id": "req-123",
          },
          status: 200,
        },
      );
    }) as typeof fetch;

    const client = createClient("https://api.example.com", testEndpoints);
    const response = await client.request.endpoint(getUserEndpoint, {
      params: { id: "user-1" },
      query: { expand: "posts" },
    });

    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe("https://api.example.com/users/user-1?expand=posts");
    expect(requests[0]?.init?.method).toBe("GET");
    expect(response.statusCode).toBe(200);
    expect(response.data).toEqual({
      id: "user-1",
      name: "sam",
    });
    expect(response.headers["x-request-id"]).toBe("req-123");
  });

  it("serializes json body and sets content-type for object payloads", async () => {
    const requests: CapturedRequest[] = [];
    globalThis.fetch = (async (input, init) => {
      requests.push({
        init,
        url: String(input),
      });
      return new Response(JSON.stringify({ id: "user-2" }), {
        headers: {
          "content-type": "application/json",
        },
        status: 201,
      });
    }) as typeof fetch;

    const client = createClient("https://api.example.com", testEndpoints);
    const response = await client.request.endpoint(postUserEndpoint, {
      body: { name: "user-2" },
    });

    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe("https://api.example.com/users");
    expect(requests[0]?.init?.method).toBe("POST");
    expect(requests[0]?.init?.body).toBe(JSON.stringify({ name: "user-2" }));
    expect(requests[0]?.init?.headers).toEqual({
      "content-type": "application/json",
    });
    expect(response.data).toEqual({ id: "user-2" });
    expect(response.statusCode).toBe(201);
  });

  it("throws when a required path param is missing", async () => {
    const client = createClient("https://api.example.com", testEndpoints);

    await expect(
      client.request.endpoint(getUserEndpoint, {
        params: {} as { id: string },
      }),
    ).rejects.toThrow('Missing path param "id" for path "/users/{id}"');
  });

  it("supports request.byRouteId and per-route request methods", async () => {
    const requests: CapturedRequest[] = [];
    globalThis.fetch = (async (input, init) => {
      requests.push({
        init,
        url: String(input),
      });
      return new Response(JSON.stringify({ id: "user-1", name: "sam" }), {
        headers: {
          "content-type": "application/json",
        },
        status: 200,
      });
    }) as typeof fetch;

    const client = createClient("https://api.example.com", testEndpoints);

    const byRouteIdResponse = await client.request.byRouteId("get_users_param_id", {
      params: { id: "user-1" },
      query: { expand: "posts" },
    });
    const routeMethod = (
      client.request as unknown as Record<
        string,
        (input: { params: { id: string }; query: { expand: string } }) => Promise<unknown>
      >
    ).get_users_param_id;
    if (!routeMethod) {
      throw new Error("expected route method");
    }
    await routeMethod({
      params: { id: "user-1" },
      query: { expand: "posts" },
    });

    expect(byRouteIdResponse.statusCode).toBe(200);
    expect(requests).toHaveLength(2);
    expect(requests[0]?.url).toBe("https://api.example.com/users/user-1?expand=posts");
    expect(requests[1]?.url).toBe("https://api.example.com/users/user-1?expand=posts");
  });

  it("supports request.GET[path] calls and normalizes missing leading slash", async () => {
    const requests: CapturedRequest[] = [];
    globalThis.fetch = (async (input, init) => {
      requests.push({
        init,
        url: String(input),
      });
      return new Response(JSON.stringify({ id: "user-1", name: "sam" }), {
        headers: {
          "content-type": "application/json",
        },
        status: 200,
      });
    }) as typeof fetch;

    const client = createClient<typeof testEndpoints>("https://api.example.com");

    const response = await client.request.GET["users/{id}"]({
      params: { id: "user-1" },
      query: { expand: "posts" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.data).toEqual({ id: "user-1", name: "sam" });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.init?.method).toBe("GET");
    expect(requests[0]?.url).toBe("https://api.example.com/users/user-1?expand=posts");
  });
});
