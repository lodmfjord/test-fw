/**
 * @fileoverview Tests toEndpointHandlerOutput behavior.
 */
import { describe, expect, it } from "bun:test";
import { toEndpointHandlerOutput } from "./to-endpoint-handler-output";

describe("toEndpointHandlerOutput", () => {
  it("uses default statusCode and preserves value", () => {
    const output = toEndpointHandlerOutput({ value: { ok: true } }, 201);

    expect(output).toEqual({
      statusCode: 201,
      value: { ok: true },
    });
  });

  it("throws when output is missing value", () => {
    expect(() => toEndpointHandlerOutput({})).toThrow("Handler output must include value");
  });

  it("throws for invalid statusCode", () => {
    expect(() =>
      toEndpointHandlerOutput({
        statusCode: 99,
        value: {},
      }),
    ).toThrow("Handler output statusCode must be between 100 and 599");
  });
});
