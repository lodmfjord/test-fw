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

    expect(functionIds).toEqual(["get_last_update"]);
  });
});
