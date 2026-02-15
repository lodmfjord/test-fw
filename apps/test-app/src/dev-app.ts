/** @fileoverview Implements dev app. @module apps/test-app/src/dev-app */
import { createMemorySqs } from "@babbstack/sqs";
import { createDevApp } from "@babbstack/http-api-contract";
import { endpoints } from "./endpoints";

export const testAppSqs = createMemorySqs();
export const testAppFetch = createDevApp(endpoints.flat(), {
  sqs: testAppSqs,
});
