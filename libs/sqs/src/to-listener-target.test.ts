/** @fileoverview Tests to listener target. @module libs/sqs/src/to-listener-target.test */
import { describe, expect, it } from "bun:test";
import { toListenerTarget } from "./to-listener-target";

describe("toListenerTarget", () => {
  it("normalizes typed step-function definitions", () => {
    const target = toListenerTarget({
      kind: "step-function",
      stateMachineName: "listener",
      definition: {
        StartAt: "Done",
        States: {
          Done: {
            Type: "Succeed",
          },
        },
      },
    });

    expect(target.kind).toBe("step-function");
    if (target.kind !== "step-function") {
      throw new Error("expected step-function target");
    }

    expect(target.definition.StartAt).toBe("Done");
    expect(target.definitionJson).toBe('{"StartAt":"Done","States":{"Done":{"Type":"Succeed"}}}');
  });

  it("normalizes JSON string step-function definitions", () => {
    const target = toListenerTarget({
      kind: "step-function",
      stateMachineName: "listener",
      definition: '{"StartAt":"Done","States":{"Done":{"Type":"Succeed"}}}',
    });

    expect(target.kind).toBe("step-function");
    if (target.kind !== "step-function") {
      throw new Error("expected step-function target");
    }

    expect(target.definition.StartAt).toBe("Done");
    expect(target.definitionJson).toBe('{"StartAt":"Done","States":{"Done":{"Type":"Succeed"}}}');
  });
});
