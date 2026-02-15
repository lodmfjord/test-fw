/**
 * @fileoverview Tests schema.
 */
import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { schema } from "./index";

describe("schema", () => {
  it("parses object input with optional properties", () => {
    const validator = schema.object({
      id: schema.string(),
      age: schema.optional(schema.number()),
      active: schema.boolean(),
    });

    const parsed = validator.parse({
      id: "u-1",
      active: true,
    });

    expect(parsed).toEqual({
      id: "u-1",
      active: true,
    });
  });

  it("throws with field path when validation fails", () => {
    const validator = schema.object({
      profile: schema.object({
        age: schema.number(),
      }),
    });

    expect(() => validator.parse({ profile: { age: "old" } })).toThrow("profile.age");
  });

  it("supports native zod schemas", () => {
    const validator = schema.fromZod(
      z.object({
        id: z.uuid(),
      }),
    );

    expect(() => validator.parse({ id: "not-a-uuid" })).toThrow("id");
    expect(validator.jsonSchema.type).toBe("object");
    expect(validator.jsonSchema.properties?.id?.type).toBe("string");
  });

  it("rejects custom refine schemas that cannot be made lambda-parity safe", () => {
    expect(() =>
      schema.fromZod(
        z.object({
          id: z.string().refine((value) => value.startsWith("u-"), "must start with u-"),
        }),
      ),
    ).toThrow("schema.fromZod does not support custom refinements");
  });
});
