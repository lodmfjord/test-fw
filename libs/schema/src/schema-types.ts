/**
 * @fileoverview Implements schema types.
 */
import type { ZodType } from "zod";

export type JsonSchemaType = "array" | "boolean" | "number" | "object" | "string";

export type JsonSchema = {
  additionalProperties?: boolean;
  description?: string;
  enum?: Array<boolean | number | string>;
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  type?: JsonSchemaType;
};

export type BaseSchema<TValue> = {
  jsonSchema: JsonSchema;
  optional?: false;
  parse: (value: unknown, path?: string) => TValue;
  zodSchema: ZodType<TValue>;
};

export type OptionalSchema<TValue> = {
  jsonSchema: JsonSchema;
  optional: true;
  parse: (value: unknown, path?: string) => TValue | undefined;
  zodSchema: ZodType<TValue | undefined>;
};

export type Schema<TValue> = BaseSchema<TValue> | OptionalSchema<TValue>;

export type InferSchemaValue<TSchema extends Schema<unknown>> =
  TSchema extends Schema<infer TValue> ? TValue : never;

export type OptionalShapeKeys<TShape extends Record<string, Schema<unknown>>> = {
  [TKey in keyof TShape]: TShape[TKey] extends { optional: true } ? TKey : never;
}[keyof TShape];

export type RequiredShapeKeys<TShape extends Record<string, Schema<unknown>>> = Exclude<
  keyof TShape,
  OptionalShapeKeys<TShape>
>;

export type ObjectFromShape<TShape extends Record<string, Schema<unknown>>> = {
  [TKey in RequiredShapeKeys<TShape>]: InferSchemaValue<TShape[TKey]>;
} & {
  [TKey in OptionalShapeKeys<TShape>]?: Exclude<InferSchemaValue<TShape[TKey]>, undefined>;
};
