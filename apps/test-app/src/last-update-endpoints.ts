/**
 * @fileoverview Implements last update endpoints.
 */
import { createSqsQueue } from "@babbstack/sqs";
import { createEnv, createSecret, defineGet } from "@babbstack/http-api-contract";
import { schema } from "@babbstack/schema";
import { z } from "zod";
import { lastUpdateStore } from "./last-update-store";

const lastUpdateMessageSchema = z.object({
  time: z.string(),
});

export const lastUpdateQueue = createSqsQueue(
  {
    parse(input) {
      return lastUpdateMessageSchema.parse(input);
    },
  },
  {
    queueName: "last-update-events",
  },
);

export const lastUpdateListener = lastUpdateQueue.addListener({
  listenerId: "last_update",
  handler: ({ message }) => {
    console.log("last_update listener received message", message);
    lastUpdateStore.update(message.time);
  },
});

const sharedEnvDemo = createEnv({
  SIMPLE_API_TEST_APP_ENV_PLAIN: "plain-value-from-create-env",
  SIMPLE_API_TEST_APP_ENV_SECRET: createSecret("/simple-api/test-app/env-secret", {
    localEnvName: "SECRET_BLE",
  }),
});

const getEnvDemoEndpoint = defineGet({
  env: [
    sharedEnvDemo,
    {
      SIMPLE_API_TEST_APP_ENV_PLAIN: "plain-value-from-endpoint-override",
    },
  ],
  path: "/env-demo",
  handler: () => {
    return {
      value: {
        plain: process.env.SIMPLE_API_TEST_APP_ENV_PLAIN ?? "",
        secret: process.env.SIMPLE_API_TEST_APP_ENV_SECRET ?? "",
      },
    };
  },
  response: schema.object({
    plain: schema.string(),
    secret: schema.string(),
  }),
  tags: ["env-demo"],
});

const getLastUpdateEndpoint = defineGet({
  path: "/last-update",
  context: {
    sqs: {
      handler: lastUpdateQueue,
    },
  },
  handler: async ({ sqs }) => {
    if (!sqs) {
      throw new Error("missing sqs context");
    }

    await sqs.send({
      time: new Date().toISOString(),
    });

    return {
      headers: {
        "x-test-app": "simple-api",
      },
      value: {
        time: lastUpdateStore.read(),
      },
    };
  },
  response: schema.object({
    time: schema.string(),
  }),
  tags: ["last-update"],
});

export const lastUpdateEndpoints = [getLastUpdateEndpoint, getEnvDemoEndpoint];
