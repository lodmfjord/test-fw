import { createMemorySqs } from "@babbstack/sqs";
import { createDevApp } from "@babbstack/http-api-contract";
import { endpoints } from "./endpoints";

export const testAppSqs = createMemorySqs();
export const testAppFetch = createDevApp(endpoints.flat(), {
  sqs: testAppSqs,
});
