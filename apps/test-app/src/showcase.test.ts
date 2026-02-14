import { describe, expect, it } from "bun:test";
import { runSqsQueueListener } from "@babbstack/sqs";
import { testAppFetch, testAppSqs } from "./dev-app";
import { lastUpdateListener } from "./endpoints";
import { testAppContract } from "./test-app-contract";

describe("test-app showcase", () => {
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
      "post_s3_demo_files",
      "get_s3_demo_files",
      "get_s3_demo_files_raw",
      "get_s3_demo_files_list",
      "get_s3_demo_secure_link",
    ]);
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
