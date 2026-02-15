/**
 * @fileoverview Tests create-client request routing behavior.
 */
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
const originalFetch = globalThis.fetch;

type CapturedRequest = {
  init: RequestInit | BunFetchRequestInit | undefined;
  url: string;
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("createClient request routing behavior", () => {
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
