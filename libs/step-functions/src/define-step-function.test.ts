/**
 * @fileoverview Tests defineStepFunction behavior.
 */
import { describe, expect, it } from "bun:test";
import { defineStepFunction } from "./define-step-function";

describe("defineStepFunction", () => {
  it("returns normalized step function definitions", () => {
    const definition = defineStepFunction({
      Comment: "Demo flow",
      StartAt: "Done",
      States: {
        Done: {
          End: true,
          Result: { ok: true },
          Type: "Pass",
        },
      },
    });

    expect(definition).toEqual({
      Comment: "Demo flow",
      StartAt: "Done",
      States: {
        Done: {
          End: true,
          Result: { ok: true },
          Type: "Pass",
        },
      },
    });
  });
});
