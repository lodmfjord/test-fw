/**
 * @fileoverview Tests schema library.
 */
import { describe, expect, it } from "bun:test";
import { schema } from "./index";

describe("schema library", () => {
  it("provides object schema parsing", () => {
    const validator = schema.object({
      id: schema.string(),
    });

    expect(validator.parse({ id: "abc" })).toEqual({ id: "abc" });
    expect(validator.jsonSchema).toEqual({
      additionalProperties: false,
      properties: {
        id: { type: "string" },
      },
      required: ["id"],
      type: "object",
    });
  });
});
