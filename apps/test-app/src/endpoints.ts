import { createSqsQueue } from "@babbstack/sqs";
import { defineGet } from "@babbstack/http-api-contract";
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

export const endpoints = [[getLastUpdateEndpoint]];
