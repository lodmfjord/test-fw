/**
 * @fileoverview Tests showcase.
 */
import { describe, expect, it } from "bun:test";
import { createDevApp } from "@babbstack/http-api-contract";
import { runSqsQueueListener } from "@babbstack/sqs";
import { testAppFetch, testAppSqs } from "./dev-app";
import { endpoints, lastUpdateListener, stepFunctionEventsListener } from "./endpoints";
import { testAppContract } from "./test-app-contract";

describe("test-app showcase", () => {
  it("returns endpoint env values for /env-demo", async () => {
    const previousSecret = process.env.SIMPLE_API_TEST_APP_ENV_SECRET;
    const previousSecretBle = process.env.SECRET_BLE;
    delete process.env.SIMPLE_API_TEST_APP_ENV_SECRET;
    process.env.SECRET_BLE = "local-secret-ble";

    const envFetch = createDevApp(endpoints.flat(), {
      sqs: testAppSqs,
    });
    const response = await envFetch(new Request("http://local/env-demo", { method: "GET" }));
    if (previousSecret === undefined) delete process.env.SIMPLE_API_TEST_APP_ENV_SECRET;
    else process.env.SIMPLE_API_TEST_APP_ENV_SECRET = previousSecret;
    if (previousSecretBle === undefined) delete process.env.SECRET_BLE;
    else process.env.SECRET_BLE = previousSecretBle;

    expect(response.status).toBe(200);
    expect((await response.json()) as { plain?: string; secret?: string }).toEqual({
      plain: "plain-value-from-endpoint-override",
      secret: "local-secret-ble",
    });
  });

  it("runs /last-update and updates via sqs listener", async () => {
    const firstResponse = await testAppFetch(
      new Request("http://local/last-update", { method: "GET" }),
    );
    expect(firstResponse.status).toBe(200);
    expect(firstResponse.headers.get("x-test-app")).toBe("simple-api");
    const firstPayload = (await firstResponse.json()) as { time?: string };
    expect(typeof firstPayload.time).toBe("string");
    if (!firstPayload.time) {
      throw new Error("expected time");
    }
    expect(new Date(firstPayload.time).toISOString()).toBe(firstPayload.time);

    const processed = await runSqsQueueListener(lastUpdateListener, testAppSqs);
    expect(processed).toBe(1);

    const secondResponse = await testAppFetch(
      new Request("http://local/last-update", { method: "GET" }),
    );
    expect(secondResponse.status).toBe(200);
    expect(secondResponse.headers.get("x-test-app")).toBe("simple-api");
    const secondPayload = (await secondResponse.json()) as { time?: string };
    expect(typeof secondPayload.time).toBe("string");
    if (!secondPayload.time) {
      throw new Error("expected time");
    }
    expect(new Date(secondPayload.time).toISOString()).toBe(secondPayload.time);
    expect(secondPayload.time).not.toBe(firstPayload.time);
  });

  it("compiles endpoints into one lambda entry for prod", () => {
    const functionIds = testAppContract.lambdasManifest.functions.map(
      (lambdaFunction) => lambdaFunction.functionId,
    );

    expect(functionIds).toEqual([
      "get_last_update",
      "get_env_demo",
      "post_s3_demo_files",
      "get_s3_demo_files",
      "get_s3_demo_files_raw",
      "get_s3_demo_files_list",
      "get_s3_demo_secure_link",
      "put_order_param_id",
      "patch_order_param_id",
      "delete_order_param_id",
      "options_order",
      "head_order_param_id",
      "post_step_function_events",
    ]);
  });

  it("runs step-function endpoint locally and keeps step-function routes out of lambda manifest", async () => {
    const response = await testAppFetch(
      new Request("http://local/step-function-demo", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          value: "demo",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect((await response.json()) as unknown).toEqual({
      ok: true,
      source: "step-function",
    });
    expect(
      testAppContract.lambdasManifest.functions.some(
        (lambdaFunction) => lambdaFunction.routeId === "post_step_function_demo",
      ),
    ).toBe(false);
    expect(
      testAppContract.lambdasManifest.functions.some(
        (lambdaFunction) => lambdaFunction.routeId === "post_step_function_random_branch",
      ),
    ).toBe(false);
    expect(
      testAppContract.openapi.paths["/step-function-demo"]?.post?.["x-babbstack"].execution.kind,
    ).toBe("step-function");
    expect(stepFunctionEventsListener.target.kind).toBe("step-function");
  });

  it("runs random branch step-function endpoint with task and choice states", async () => {
    const response = await testAppFetch(
      new Request("http://local/step-function-random-branch", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      branch?: string;
      message?: string;
      random?: number;
    };
    expect(typeof payload.random).toBe("number");
    expect((payload.random ?? 0) >= 1).toBe(true);
    expect((payload.random ?? 0) <= 100).toBe(true);
    expect(typeof payload.message).toBe("string");

    if ((payload.random ?? 0) < 51) {
      expect(payload.branch).toBe("low");
    } else {
      expect(payload.branch).toBe("high");
    }
  });

  it("runs /step-function-events and processes the step-function targeted listener locally", async () => {
    const response = await testAppFetch(
      new Request("http://local/step-function-events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          eventId: "event-1",
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect((await response.json()) as unknown).toEqual({
      accepted: true,
      eventId: "event-1",
    });

    const processed = await runSqsQueueListener(stepFunctionEventsListener, testAppSqs);
    expect(processed).toBe(1);
    expect(stepFunctionEventsListener.target.kind).toBe("step-function");
  });

  it("runs local s3 demo endpoints for put, get, list, and secure-link", async () => {
    const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    const bucketName = "local-demo-bucket";
    const key = `demo/${uniqueId}.txt`;
    const content = `local-file-${uniqueId}`;
    const contentType = "text/plain";

    const putResponse = await testAppFetch(
      new Request("http://local/s3-demo/files", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          bucketName,
          content,
          contentType,
          key,
        }),
      }),
    );
    expect(putResponse.status).toBe(200);
    expect((await putResponse.json()) as unknown).toEqual({
      bucketName,
      contentType,
      key,
      size: content.length,
    });

    const getResponse = await testAppFetch(
      new Request(
        `http://local/s3-demo/files?bucketName=${encodeURIComponent(bucketName)}&key=${encodeURIComponent(key)}`,
        {
          method: "GET",
        },
      ),
    );
    expect(getResponse.status).toBe(200);
    expect((await getResponse.json()) as unknown).toEqual({
      bucketName,
      content,
      contentType,
      key,
      size: content.length,
    });

    const rawResponse = await testAppFetch(
      new Request(
        `http://local/s3-demo/files/raw?bucketName=${encodeURIComponent(bucketName)}&key=${encodeURIComponent(key)}`,
        {
          method: "GET",
        },
      ),
    );
    expect(rawResponse.status).toBe(200);
    expect(rawResponse.headers.get("content-type")).toBe(contentType);
    expect(Buffer.from(await rawResponse.arrayBuffer()).toString("utf8")).toBe(content);

    const listResponse = await testAppFetch(
      new Request(
        `http://local/s3-demo/files/list?bucketName=${encodeURIComponent(bucketName)}&prefix=${encodeURIComponent("demo/")}`,
        {
          method: "GET",
        },
      ),
    );
    expect(listResponse.status).toBe(200);
    const listPayload = (await listResponse.json()) as {
      items?: Array<{
        bucketName?: string;
        contentType?: string;
        key?: string;
        size?: number;
      }>;
    };
    expect(Array.isArray(listPayload.items)).toBe(true);
    expect(listPayload.items).toEqual(
      expect.arrayContaining([
        {
          bucketName,
          contentType,
          key,
          size: content.length,
        },
      ]),
    );
    expect((listPayload.items?.length ?? 0) >= 1).toBe(true);

    const secureLinkResponse = await testAppFetch(
      new Request(
        `http://local/s3-demo/secure-link?bucketName=${encodeURIComponent(bucketName)}&key=${encodeURIComponent(key)}&operation=get`,
        {
          method: "GET",
        },
      ),
    );
    expect(secureLinkResponse.status).toBe(200);
    const secureLinkPayload = (await secureLinkResponse.json()) as { url?: unknown };
    expect(typeof secureLinkPayload.url).toBe("string");
    expect(String(secureLinkPayload.url).startsWith("http://localhost:4569/local-s3/secure?")).toBe(
      true,
    );
  });
});
