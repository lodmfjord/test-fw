/**
 * @fileoverview Implements order endpoints.
 */
import {
  defineDelete,
  defineHead,
  defineOptions,
  definePatch,
  definePut,
} from "@babbstack/http-api-contract";
import { schema } from "@babbstack/schema";

const orderParamsSchema = schema.object({
  id: schema.string(),
});

const putOrderEndpoint = definePut({
  path: "/order/{id}",
  handler: ({ body, params }) => {
    return {
      value: {
        amount: body.amount,
        id: params.id,
        status: "updated",
      },
    };
  },
  request: {
    body: schema.object({
      amount: schema.number(),
    }),
    params: orderParamsSchema,
  },
  response: schema.object({
    amount: schema.number(),
    id: schema.string(),
    status: schema.string(),
  }),
  tags: ["order-demo"],
});

const patchOrderEndpoint = definePatch({
  path: "/order/{id}",
  handler: ({ body, params }) => {
    return {
      value: {
        id: params.id,
        status: body.status,
      },
    };
  },
  request: {
    body: schema.object({
      status: schema.string(),
    }),
    params: orderParamsSchema,
  },
  response: schema.object({
    id: schema.string(),
    status: schema.string(),
  }),
  tags: ["order-demo"],
});

const deleteOrderEndpoint = defineDelete({
  path: "/order/{id}",
  handler: ({ params }) => {
    return {
      value: {
        deleted: true,
        id: params.id,
      },
    };
  },
  request: {
    params: orderParamsSchema,
  },
  response: schema.object({
    deleted: schema.boolean(),
    id: schema.string(),
  }),
  tags: ["order-demo"],
});

const optionsOrderEndpoint = defineOptions({
  path: "/order",
  handler: () => {
    return {
      headers: {
        "access-control-allow-headers": "content-type,authorization",
        "access-control-allow-methods": "PUT,PATCH,DELETE,HEAD,OPTIONS",
        "access-control-allow-origin": "https://app.example.com",
      },
      value: {
        methods: ["PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
      },
    };
  },
  response: schema.object({
    methods: schema.array(schema.string()),
  }),
  tags: ["order-demo"],
});

const headOrderEndpoint = defineHead({
  path: "/order/{id}",
  handler: ({ params }) => {
    return {
      headers: {
        "x-order-id": params.id,
      },
      value: {
        exists: true,
      },
    };
  },
  request: {
    params: orderParamsSchema,
  },
  response: schema.object({
    exists: schema.boolean(),
  }),
  tags: ["order-demo"],
});

export const orderEndpoints = [
  putOrderEndpoint,
  patchOrderEndpoint,
  deleteOrderEndpoint,
  optionsOrderEndpoint,
  headOrderEndpoint,
];
