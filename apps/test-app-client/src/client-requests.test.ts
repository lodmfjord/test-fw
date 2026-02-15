/** @fileoverview Tests client requests. @module apps/test-app-client/src/client-requests.test */
import { afterEach, describe, expect, it } from "bun:test";
import { createClient } from "@babbstack/client";
import type { endpoints as testAppEndpoints } from "../../test-app/src/endpoints";

type TestAppEndpoints = typeof testAppEndpoints;
type Assert<TValue extends true> = TValue;

const baseUrl = "https://api.example.com";
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

/** Handles assert typed request input output. */ function _assertTypedRequestInputOutput(): void {
  const client = createClient<TestAppEndpoints>(baseUrl);

  const lastUpdateRequest = client.request.GET["last-update"]({});
  type LastUpdateData = Awaited<typeof lastUpdateRequest>["data"];
  type _assertLastUpdateData = Assert<LastUpdateData extends { time: string } ? true : false>;

  const stepFunctionRequest = client.request.POST["step-function-demo"]({
    body: { value: "demo" },
  });
  type StepFunctionData = Awaited<typeof stepFunctionRequest>["data"];
  type _assertStepFunctionData = Assert<
    StepFunctionData extends { ok: boolean; source: string } ? true : false
  >;

  const putOrderRequest = client.request.PUT["order/{id}"]({
    body: { amount: 99 },
    params: { id: "order-1" },
  });
  type PutOrderData = Awaited<typeof putOrderRequest>["data"];
  type _assertPutOrderData = Assert<
    PutOrderData extends { amount: number; id: string; status: string } ? true : false
  >;

  const patchOrderRequest = client.request.PATCH["order/{id}"]({
    body: { status: "closed" },
    params: { id: "order-1" },
  });
  type PatchOrderData = Awaited<typeof patchOrderRequest>["data"];
  type _assertPatchOrderData = Assert<
    PatchOrderData extends { id: string; status: string } ? true : false
  >;

  const deleteOrderRequest = client.request.DELETE["order/{id}"]({
    params: { id: "order-1" },
  });
  type DeleteOrderData = Awaited<typeof deleteOrderRequest>["data"];
  type _assertDeleteOrderData = Assert<
    DeleteOrderData extends { deleted: boolean; id: string } ? true : false
  >;

  const optionsOrderRequest = client.request.OPTIONS.order({});
  type OptionsOrderData = Awaited<typeof optionsOrderRequest>["data"];
  type _assertOptionsOrderData = Assert<
    OptionsOrderData extends { methods: string[] } ? true : false
  >;

  const headOrderRequest = client.request.HEAD["order/{id}"]({
    params: { id: "order-1" },
  });
  type HeadOrderData = Awaited<typeof headOrderRequest>["data"];
  type _assertHeadOrderData = Assert<HeadOrderData extends { exists: boolean } ? true : false>;

  const unknownGetPath = "hehe" as const;
  // @ts-expect-error unknown GET path is not allowed
  void client.request.GET[unknownGetPath]({});
  // @ts-expect-error wrong method for known path is not allowed
  void client.request.GET["step-function-demo"]({});
  // @ts-expect-error body.value must be string
  void client.request.POST["step-function-demo"]({ body: { value: 123 } });
}

describe("test-app-client request typing and runtime behavior", () => {
  it("calls GET last-update and parses response data", async () => {
    const calls: Array<{ method: string; url: string }> = [];
    globalThis.fetch = (async (input, init) => {
      calls.push({
        method: String(init?.method ?? "GET"),
        url: String(input),
      });
      return Response.json({
        time: "2026-02-15T00:00:00.000Z",
      });
    }) as typeof fetch;

    const client = createClient<TestAppEndpoints>(baseUrl);
    const response = await client.request.GET["last-update"]({});

    expect(response.statusCode).toBe(200);
    expect(response.ok).toBe(true);
    expect(response.data).toEqual({
      time: "2026-02-15T00:00:00.000Z",
    });
    expect(calls).toEqual([
      {
        method: "GET",
        url: "https://api.example.com/last-update",
      },
    ]);
  });

  it("calls POST step-function-demo and sends typed json body", async () => {
    const calls: Array<{ body: unknown; method: string; url: string }> = [];
    globalThis.fetch = (async (input, init) => {
      calls.push({
        body: init?.body ?? undefined,
        method: String(init?.method ?? "GET"),
        url: String(input),
      });
      return Response.json({
        ok: true,
        source: "step-function",
      });
    }) as typeof fetch;

    const client = createClient<TestAppEndpoints>(baseUrl);
    const response = await client.request.POST["step-function-demo"]({
      body: {
        value: "demo",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.ok).toBe(true);
    expect(response.data).toEqual({
      ok: true,
      source: "step-function",
    });
    expect(calls).toEqual([
      {
        body: JSON.stringify({
          value: "demo",
        }),
        method: "POST",
        url: "https://api.example.com/step-function-demo",
      },
    ]);
  });

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
    expect(calls).toEqual([
      {
        body: JSON.stringify({
          amount: 99,
        }),
        method: "PUT",
        url: "https://api.example.com/order/order-1",
      },
      {
        body: undefined,
        method: "DELETE",
        url: "https://api.example.com/order/order-1",
      },
      {
        body: undefined,
        method: "OPTIONS",
        url: "https://api.example.com/order",
      },
      {
        body: undefined,
        method: "HEAD",
        url: "https://api.example.com/order/order-1",
      },
    ]);
  });
});
