/**
 * @fileoverview Tests test-app-client request http method behavior.
 */
import { afterEach, describe, expect, it } from "bun:test";
import { createClient } from "@babbstack/client";
import type { endpoints as testAppEndpoints } from "../../test-app/src/endpoints";

type TestAppEndpoints = typeof testAppEndpoints;

const baseUrl = "https://api.example.com";
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("test-app-client request typing and runtime behavior http methods", () => {
  it("calls PATCH order/{id} and sends typed json body", async () => {
    const calls: Array<{ body: unknown; method: string; url: string }> = [];
    globalThis.fetch = (async (input, init) => {
      calls.push({
        body: init?.body ?? undefined,
        method: String(init?.method ?? "GET"),
        url: String(input),
      });
      return Response.json({
        id: "order-1",
        status: "closed",
      });
    }) as typeof fetch;

    const client = createClient<TestAppEndpoints>(baseUrl);
    const response = await client.request.PATCH["order/{id}"]({
      body: {
        status: "closed",
      },
      params: {
        id: "order-1",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.ok).toBe(true);
    expect(response.data).toEqual({
      id: "order-1",
      status: "closed",
    });
    expect(calls).toEqual([
      {
        body: JSON.stringify({
          status: "closed",
        }),
        method: "PATCH",
        url: "https://api.example.com/order/order-1",
      },
    ]);
  });

  it("calls PUT/DELETE/OPTIONS/HEAD order endpoints", async () => {
    const calls: Array<{ body: unknown; method: string; url: string }> = [];
    globalThis.fetch = (async (input, init) => {
      const method = String(init?.method ?? "GET");
      calls.push({
        body: init?.body ?? undefined,
        method,
        url: String(input),
      });

      if (method === "PUT") {
        return Response.json({
          amount: 99,
          id: "order-1",
          status: "updated",
        });
      }
      if (method === "DELETE") {
        return Response.json({
          deleted: true,
          id: "order-1",
        });
      }
      if (method === "OPTIONS") {
        return Response.json({
          methods: ["PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
        });
      }
      if (method === "HEAD") {
        return Response.json({
          exists: true,
        });
      }

      throw new Error(`unexpected method ${method}`);
    }) as typeof fetch;

    const client = createClient<TestAppEndpoints>(baseUrl);
    const putResponse = await client.request.PUT["order/{id}"]({
      body: {
        amount: 99,
      },
      params: {
        id: "order-1",
      },
    });
    const deleteResponse = await client.request.DELETE["order/{id}"]({
      params: {
        id: "order-1",
      },
    });
    const optionsResponse = await client.request.OPTIONS.order({});
    const headResponse = await client.request.HEAD["order/{id}"]({
      params: {
        id: "order-1",
      },
    });

    expect(putResponse.data).toEqual({
      amount: 99,
      id: "order-1",
      status: "updated",
    });
    expect(deleteResponse.data).toEqual({
      deleted: true,
      id: "order-1",
    });
    expect(optionsResponse.data).toEqual({
      methods: ["PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
    });
    expect(headResponse.data).toEqual({
      exists: true,
    });
  });
});
