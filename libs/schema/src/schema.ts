/**
 * @fileoverview Implements schema.
 */
import { z, type ZodType } from "zod";
import { schemaParityHelpers } from "./schema-parity-helpers";
import type { JsonSchema, ObjectFromShape, OptionalSchema, Schema } from "./schema-types";

/** Runs fail. */
function fail(path: string | undefined, message: string): never {
  const scope = path && path.length > 0 ? path : "value";
  throw new Error(`${scope}: ${message}`);
}

/** Converts to path. */
function toPath(parentPath: string | undefined, key: string | undefined): string | undefined {
  if (!key || key.length === 0) {
    return parentPath;
  }

  if (!parentPath || parentPath.length === 0) {
    return key;
  }

  return `${parentPath}.${key}`;
}

/** Converts to issue path. */
function toIssuePath(path: PropertyKey[]): string | undefined {
  if (path.length === 0) {
    return undefined;
  }

  return path.map((segment) => String(segment)).join(".");
}

/** Converts to issue message. */
function toIssueMessage(issue: z.core.$ZodIssue): string {
  if (issue.code === "invalid_type") {
    return `expected ${issue.expected}`;
  }

  return issue.message;
}

/** Parses with zod. */
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

/** Converts to object schema. */
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

/** Converts to json schema. */
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

/** Converts to schema. */
function toSchema<TValue>(zodSchema: ZodType<TValue>, jsonSchema: JsonSchema): Schema<TValue> {
  return {
    jsonSchema,
    parse(value: unknown, path?: string): TValue {
      return parseWithZod(zodSchema, value, path);
    },
    zodSchema,
  };
}

/** Converts to optional schema. */
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

const schema = {
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
    schemaParityHelpers.assertLambdaParitySafeFromZodSchema(
      // unsafe-cast: invariant = parity checks validate the incoming zod schema shape at runtime.
      zodSchema as unknown as ZodType<unknown>,
    );
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
          // unsafe-cast: invariant = zodShape is built from shape validators keyed to the same object fields.
          z.object(zodShape) as unknown as ZodType<ObjectFromShape<TShape>>,
          value,
          path,
        );
      },
      // unsafe-cast: invariant = zodShape is assembled from the exact generic shape keys and validators.
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

export { schema };
