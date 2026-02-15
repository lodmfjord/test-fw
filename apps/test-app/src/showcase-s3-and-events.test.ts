/**
 * @fileoverview Tests showcase s3 and step-function event behavior.
 */
import { describe, expect, it } from "bun:test";
import { runSqsQueueListener } from "@babbstack/sqs";
import { testAppFetch, testAppSqs } from "./dev-app";
import { stepFunctionEventsListener } from "./endpoints";

describe("test-app showcase s3 and events", () => {
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
        { method: "GET" },
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
        { method: "GET" },
      ),
    );
    expect(rawResponse.status).toBe(200);
    expect(rawResponse.headers.get("content-type")).toBe(contentType);
    expect(Buffer.from(await rawResponse.arrayBuffer()).toString("utf8")).toBe(content);

    const listResponse = await testAppFetch(
      new Request(
        `http://local/s3-demo/files/list?bucketName=${encodeURIComponent(bucketName)}&prefix=${encodeURIComponent("demo/")}`,
        { method: "GET" },
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
        { method: "GET" },
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
