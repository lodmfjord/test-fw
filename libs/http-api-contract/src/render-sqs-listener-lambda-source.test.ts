/**
 * @fileoverview Tests renderSqsListenerLambdaSource behavior.
 */
import { describe, expect, it } from "bun:test";
import { renderSqsListenerLambdaSource } from "./render-sqs-listener-lambda-source";

describe("renderSqsListenerLambdaSource", () => {
  it("renders listener loading and record-processing logic", () => {
    const source = renderSqsListenerLambdaSource(
      {
        listenerId: "order_created",
      } as never,
      "/tmp/endpoints.ts",
      "@babbstack/sqs",
    );

    expect(source).toContain('import { listDefinedSqsListeners } from "@babbstack/sqs";');
    expect(source).toContain('await import("/tmp/endpoints.ts")');
    expect(source).toContain('item.listenerId === "order_created"');
    expect(source).toContain('throw new Error("SQS listener not found for order_created")');
    expect(source).toContain("function parseRecordBody(record)");
    expect(source).toContain("batchItemFailures: []");
  });
});
