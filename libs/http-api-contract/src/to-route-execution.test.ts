import { describe, expect, it } from "bun:test";
import { toRouteExecution } from "./to-route-execution";

describe("toRouteExecution", () => {
  it("normalizes typed step-function definitions", () => {
    const execution = toRouteExecution({
      kind: "step-function",
      stateMachineName: "demo",
      definition: {
        StartAt: "Done",
        States: {
          Done: {
            Type: "Succeed",
          },
        },
      },
    });

    expect(execution.kind).toBe("step-function");
    if (execution.kind !== "step-function") {
      throw new Error("expected step-function execution");
    }

    expect(execution.definition.StartAt).toBe("Done");
    expect(execution.definitionJson).toBe(
      '{"StartAt":"Done","States":{"Done":{"Type":"Succeed"}}}',
    );
  });

  it("normalizes JSON string step-function definitions", () => {
    const execution = toRouteExecution({
      kind: "step-function",
      stateMachineName: "demo",
      definition: '{"StartAt":"Done","States":{"Done":{"Type":"Succeed"}}}',
    });

    expect(execution.kind).toBe("step-function");
    if (execution.kind !== "step-function") {
      throw new Error("expected step-function execution");
    }

    expect(execution.definition.StartAt).toBe("Done");
    expect(execution.definitionJson).toBe(
      '{"StartAt":"Done","States":{"Done":{"Type":"Succeed"}}}',
    );
  });
});
