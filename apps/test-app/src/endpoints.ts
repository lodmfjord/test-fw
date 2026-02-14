import { createSqsQueue } from "@babbstack/sqs";
import { createRuntimeS3 } from "@babbstack/s3";
import { defineGet, definePost } from "@babbstack/http-api-contract";
import { schema } from "@babbstack/schema";
import { z } from "zod";
import { lastUpdateStore } from "./last-update-store";
import {
  postStepFunctionDemoEndpoint,
  postStepFunctionEventsEndpoint,
  postStepFunctionRandomBranchEndpoint,
  stepFunctionEventsListener,
} from "./step-function-demo";

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

const s3 = createRuntimeS3();

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

const putS3DemoFileEndpoint = definePost({
  path: "/s3-demo/files",
  handler: async ({ body }) => {
    const summary = await s3.put({
      body: body.content,
      bucketName: body.bucketName,
      contentType: body.contentType,
      key: body.key,
    });

    return {
      value: summary,
    };
  },
  request: {
    body: schema.object({
      bucketName: schema.string(),
      content: schema.string(),
      contentType: schema.string(),
      key: schema.string(),
    }),
  },
  response: schema.object({
    bucketName: schema.string(),
    contentType: schema.string(),
    key: schema.string(),
    size: schema.number(),
  }),
  tags: ["s3-demo"],
});

const getS3DemoFileEndpoint = defineGet({
  path: "/s3-demo/files",
  handler: async ({ query }) => {
    const object = await s3.get({
      bucketName: query.bucketName,
      key: query.key,
    });
    if (!object) {
      throw new Error("S3 object not found");
    }

    return {
      value: {
        bucketName: object.bucketName,
        content: new TextDecoder().decode(object.body),
        contentType: object.contentType,
        key: object.key,
        size: object.size,
      },
    };
  },
  request: {
    query: schema.object({
      bucketName: schema.string(),
      key: schema.string(),
    }),
  },
  response: schema.object({
    bucketName: schema.string(),
    content: schema.string(),
    contentType: schema.string(),
    key: schema.string(),
    size: schema.number(),
  }),
  tags: ["s3-demo"],
});

const getS3DemoRawFileEndpoint = defineGet({
  path: "/s3-demo/files/raw",
  handler: async ({ query }) => {
    const object = await s3.get({
      bucketName: query.bucketName,
      key: query.key,
    });
    if (!object) {
      throw new Error("S3 object not found");
    }

    return {
      contentType: object.contentType,
      value: Buffer.from(object.body),
    };
  },
  request: {
    query: schema.object({
      bucketName: schema.string(),
      key: schema.string(),
    }),
  },
  response: schema.string(),
  tags: ["s3-demo"],
});

const listS3DemoFilesEndpoint = defineGet({
  path: "/s3-demo/files/list",
  handler: async ({ query }) => {
    const items = await s3.list({
      bucketName: query.bucketName,
      ...(query.prefix ? { prefix: query.prefix } : {}),
    });

    return {
      value: {
        items,
      },
    };
  },
  request: {
    query: schema.object({
      bucketName: schema.string(),
      prefix: schema.optional(schema.string()),
    }),
  },
  response: schema.object({
    items: schema.array(
      schema.object({
        bucketName: schema.string(),
        contentType: schema.string(),
        key: schema.string(),
        size: schema.number(),
      }),
    ),
  }),
  tags: ["s3-demo"],
});

const getS3DemoSecureLinkEndpoint = defineGet({
  path: "/s3-demo/secure-link",
  handler: async ({ query }) => {
    const url = await s3.createSecureLink({
      bucketName: query.bucketName,
      ...(query.contentType ? { contentType: query.contentType } : {}),
      ...(query.expiresInSeconds
        ? { expiresInSeconds: Number.parseInt(query.expiresInSeconds, 10) }
        : {}),
      key: query.key,
      ...(query.operation ? { operation: query.operation } : {}),
    });

    return {
      value: {
        url,
      },
    };
  },
  request: {
    query: schema.fromZod(
      z.object({
        bucketName: z.string(),
        contentType: z.string().optional(),
        expiresInSeconds: z.string().optional(),
        key: z.string(),
        operation: z.enum(["get", "put"]).optional(),
      }),
    ),
  },
  response: schema.object({
    url: schema.string(),
  }),
  tags: ["s3-demo"],
});

export const endpoints = [
  [getLastUpdateEndpoint],
  [
    putS3DemoFileEndpoint,
    getS3DemoFileEndpoint,
    getS3DemoRawFileEndpoint,
    listS3DemoFilesEndpoint,
    getS3DemoSecureLinkEndpoint,
  ],
  [
    postStepFunctionDemoEndpoint,
    postStepFunctionEventsEndpoint,
    postStepFunctionRandomBranchEndpoint,
  ],
];

export { stepFunctionEventsListener };
