import { z, type ZodIssue, type ZodType } from "zod";
import type { JsonSchema, ObjectFromShape, OptionalSchema, Schema } from "./schema-types";

function fail(path: string | undefined, message: string): never {
  const scope = path && path.length > 0 ? path : "value";
  throw new Error(`${scope}: ${message}`);
}

function toPath(parentPath: string | undefined, key: string | undefined): string | undefined {
  if (!key || key.length === 0) {
    return parentPath;
  }

  if (!parentPath || parentPath.length === 0) {
    return key;
  }

  return `${parentPath}.${key}`;
}

function toIssuePath(path: PropertyKey[]): string | undefined {
  if (path.length === 0) {
    return undefined;
  }

  return path.map((segment) => String(segment)).join(".");
}

function toIssueMessage(issue: ZodIssue): string {
  if (issue.code === "invalid_type") {
    return `expected ${issue.expected}`;
  }

  return issue.message;
}

function parseWithZod<TValue>(
  zodSchema: ZodType<TValue>,
  value: unknown,
  path: string | undefined,
): TValue {
  const parsed = zodSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }

  const issue = parsed.error.issues[0];
  if (!issue) {
    fail(path, "invalid value");
  }

  fail(toPath(path, toIssuePath(issue.path)), toIssueMessage(issue));
}

function toObjectSchema(shape: Record<string, Schema<unknown>>): JsonSchema {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];

  for (const [key, validator] of Object.entries(shape)) {
    properties[key] = validator.jsonSchema;
    if (!validator.optional) {
      required.push(key);
    }
  }

  return {
    additionalProperties: false,
    properties,
    required,
    type: "object",
  };
}

function toJsonSchema(zodSchema: ZodType<unknown>): JsonSchema {
  const schemaWithMeta = z.toJSONSchema(zodSchema) as JsonSchema & {
    $schema?: string;
  };

  if (!("$schema" in schemaWithMeta)) {
    return schemaWithMeta;
  }

  const { $schema: _schema, ...jsonSchema } = schemaWithMeta;
  return jsonSchema;
}

function toSchema<TValue>(zodSchema: ZodType<TValue>, jsonSchema: JsonSchema): Schema<TValue> {
  return {
    jsonSchema,
    parse(value: unknown, path?: string): TValue {
      return parseWithZod(zodSchema, value, path);
    },
    zodSchema,
  };
}

function toOptionalSchema<TValue>(inner: Schema<TValue>): OptionalSchema<TValue> {
  const zodSchema = inner.zodSchema.optional();

  return {
    jsonSchema: inner.jsonSchema,
    optional: true,
    parse(value: unknown, path?: string): TValue | undefined {
      return parseWithZod(zodSchema, value, path);
    },
    zodSchema,
  };
}

export const schema = {
  array<TValue>(item: Schema<TValue>): Schema<TValue[]> {
    return toSchema(z.array(item.zodSchema as ZodType<TValue>), {
      items: item.jsonSchema,
      type: "array",
    });
  },

  boolean(): Schema<boolean> {
    return toSchema(z.boolean(), {
      type: "boolean",
    });
  },

  fromZod<TValue>(zodSchema: ZodType<TValue>): Schema<TValue> {
    return toSchema(zodSchema, toJsonSchema(zodSchema));
  },

  number(): Schema<number> {
    return toSchema(z.number(), {
      type: "number",
    });
  },

  object<TShape extends Record<string, Schema<unknown>>>(
    shape: TShape,
  ): Schema<ObjectFromShape<TShape>> {
    const zodShape: Record<string, ZodType<unknown>> = {};
    for (const [key, validator] of Object.entries(shape)) {
      zodShape[key] = validator.zodSchema;
    }

    return {
      jsonSchema: toObjectSchema(shape),
      parse(value: unknown, path?: string): ObjectFromShape<TShape> {
        return parseWithZod(
          z.object(zodShape) as unknown as ZodType<ObjectFromShape<TShape>>,
          value,
          path,
        );
      },
      zodSchema: z.object(zodShape) as unknown as ZodType<ObjectFromShape<TShape>>,
    };
  },

  optional<TValue>(inner: Schema<TValue>): OptionalSchema<TValue> {
    return toOptionalSchema(inner);
  },

  string(): Schema<string> {
    return toSchema(z.string(), {
      type: "string",
    });
  },
};
