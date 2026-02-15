/**
 * @fileoverview Implements shared test-app sqs client.
 */
import { createMemorySqs } from "@babbstack/sqs";

export const testAppSqs = createMemorySqs();
