import { defineGet, definePatch, definePost } from "@babbstack/http-api-contract";
import { schema } from "@babbstack/schema";
import slugify from "slugify";
import { pointDatabase, titleDatabase } from "./db";

defineGet({
  access: {
    db: "read",
  },
  path: "/health",
  handler: () => {
    return {
      value: {
        status: "ok",
      },
    };
  },
  response: schema.object({
    status: schema.string(),
  }),
  summary: "Health check",
  tags: ["system"],
});

defineGet({
  access: {
    db: "read",
  },
  path: "/hello_world",
  handler: async () => {
    return {
      value: {
        hello: slugify("Hello World From Package", {
          lower: true,
          strict: true,
        }),
      },
    };
  },
  response: schema.object({
    hello: schema.string(),
  }),
  summary: "Health check",
  tags: ["system"],
});

definePost({
  access: {
    db: "write",
  },
  path: "/users",
  handler: ({ body }) => {
    return {
      value: {
        id: `user-${body.name}`,
      },
    };
  },
  request: {
    body: schema.object({
      name: schema.string(),
    }),
  },
  response: schema.object({
    id: schema.string(),
  }),
  tags: ["users"],
});

defineGet({
  context: {
    database: {
      access: ["read"],
      handler: pointDatabase,
    },
  },
  path: "/test-db-one/{id}",
  handler: async ({ database, params }) => {
    const existing = await database.read({
      id: params.id,
    });

    if (existing) {
      return {
        value: existing,
      };
    }

    return {
      value: {
        id: params.id,
        name: `test-db-one-${params.id}`,
        points: 0,
      },
    };
  },
  request: {
    params: schema.object({
      id: schema.string(),
    }),
  },
  response: schema.object({
    id: schema.string(),
    name: schema.string(),
    points: schema.number(),
  }),
  tags: ["test-db-one"],
});

definePatch({
  context: {
    database: {
      access: ["write"],
      handler: pointDatabase,
    },
  },
  path: "/test-db-one/{id}",
  handler: async ({ body, database, params }) => {
    const existing = await database.read({
      id: params.id,
    });

    const seeded =
      existing ??
      (await database.write({
        id: params.id,
        name: `test-db-one-${params.id}`,
        points: 0,
      }));
    const updated = await database.update(
      {
        id: params.id,
      },
      body,
    );

    return {
      value: updated ?? seeded,
    };
  },
  request: {
    body: schema.object({
      name: schema.optional(schema.string()),
      points: schema.optional(schema.number()),
    }),
    params: schema.object({
      id: schema.string(),
    }),
  },
  response: schema.object({
    id: schema.string(),
    name: schema.string(),
    points: schema.number(),
  }),
  tags: ["test-db-one"],
});

defineGet({
  context: {
    database: {
      access: ["read"],
      handler: titleDatabase,
    },
  },
  path: "/test-db-two/{id}",
  handler: async ({ database, params }) => {
    const existing = await database.read({
      id: params.id,
    });

    if (existing) {
      return {
        value: existing,
      };
    }

    return {
      value: {
        enabled: false,
        id: params.id,
        title: `test-db-two-${params.id}`,
      },
    };
  },
  request: {
    params: schema.object({
      id: schema.string(),
    }),
  },
  response: schema.object({
    enabled: schema.boolean(),
    id: schema.string(),
    title: schema.string(),
  }),
  tags: ["test-db-two"],
});

definePatch({
  context: {
    database: {
      access: ["write"],
      handler: titleDatabase,
    },
  },
  path: "/test-db-two/{id}",
  handler: async ({ body, database, params }) => {
    const existing = await database.read({
      id: params.id,
    });

    const seeded =
      existing ??
      (await database.write({
        enabled: false,
        id: params.id,
        title: `test-db-two-${params.id}`,
      }));
    const updated = await database.update(
      {
        id: params.id,
      },
      body,
    );

    return {
      value: updated ?? seeded,
    };
  },
  request: {
    body: schema.object({
      enabled: schema.optional(schema.boolean()),
      title: schema.optional(schema.string()),
    }),
    params: schema.object({
      id: schema.string(),
    }),
  },
  response: schema.object({
    enabled: schema.boolean(),
    id: schema.string(),
    title: schema.string(),
  }),
  tags: ["test-db-two"],
});
