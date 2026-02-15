/**
 * @fileoverview Implements dev app.
 */
import { createDevApp } from "@babbstack/http-api-contract";
import { endpoints } from "./endpoints";
import { testAppSqs } from "./test-app-sqs";

export const testAppFetch = createDevApp(endpoints.flat(), {
  sqs: testAppSqs,
});
