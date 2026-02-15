/**
 * @fileoverview Implements s3 demo endpoints.
 */
import { createBucket } from "@babbstack/s3";
import { defineGet, definePost } from "@babbstack/http-api-contract";
import { schema } from "@babbstack/schema";
import { z } from "zod";

const s3DemoBucket = createBucket({ name: "test-app-s3-demo" });

const putS3DemoFileEndpoint = definePost({
  path: "/s3-demo/files",
  context: {
    s3: {
      access: ["write"],
      handler: s3DemoBucket,
    },
  },
  handler: async ({ body, s3 }) => {
    if (!s3) {
      throw new Error("missing s3 context");
    }
    const summary = await s3.put({
      body: body.content,
      contentType: body.contentType,
      key: body.key,
    });

    return {
      value: summary,
    };
  },
  request: {
    body: schema.object({
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
  context: {
    s3: {
      access: ["read"],
      handler: s3DemoBucket,
    },
  },
  handler: async ({ query, s3 }) => {
    if (!s3) {
      throw new Error("missing s3 context");
    }

    const object = await s3.get({
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
  context: {
    s3: {
      access: ["read"],
      handler: s3DemoBucket,
    },
  },
  handler: async ({ query, s3 }) => {
    if (!s3) {
      throw new Error("missing s3 context");
    }

    const object = await s3.get({
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
      key: schema.string(),
    }),
  },
  response: schema.string(),
  tags: ["s3-demo"],
});

const listS3DemoFilesEndpoint = defineGet({
  path: "/s3-demo/files/list",
  context: {
    s3: {
      access: ["list"],
      handler: s3DemoBucket,
    },
  },
  handler: async ({ query, s3 }) => {
    if (!s3) {
      throw new Error("missing s3 context");
    }

    const items = await s3.list({
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
  context: {
    s3: {
      access: ["read", "write"],
      handler: s3DemoBucket,
    },
  },
  handler: async ({ query, s3 }) => {
    if (!s3) {
      throw new Error("missing s3 context");
    }

    const url = await s3.createSecureLink({
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

export const s3DemoEndpoints = [
  putS3DemoFileEndpoint,
  getS3DemoFileEndpoint,
  getS3DemoRawFileEndpoint,
  listS3DemoFilesEndpoint,
  getS3DemoSecureLinkEndpoint,
];
