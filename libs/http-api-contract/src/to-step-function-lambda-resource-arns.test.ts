/**
 * @fileoverview Tests toStepFunctionLambdaResourceArns behavior.
 */
import { describe, expect, it } from "bun:test";
import { toStepFunctionLambdaResourceArns } from "./to-step-function-lambda-resource-arns";

describe("toStepFunctionLambdaResourceArns", () => {
  it("returns unique lambda task arns from nested states", () => {
    const arns = toStepFunctionLambdaResourceArns(
      JSON.stringify({
        StartAt: "RunTopTask",
        States: {
          RunTopTask: {
            Next: "RunParallel",
            Resource: "arn:aws:lambda:eu-west-1:123456789012:function:top-task",
            Type: "Task",
          },
          RunParallel: {
            Branches: [
              {
                StartAt: "NestedTask",
                States: {
                  NestedTask: {
                    End: true,
                    Resource: "arn:aws:lambda:eu-west-1:123456789012:function:nested-task",
                    Type: "Task",
                  },
                },
              },
            ],
            End: true,
            Type: "Parallel",
          },
        },
      }),
    );

    expect(arns).toEqual([
      "arn:aws:lambda:eu-west-1:123456789012:function:nested-task",
      "arn:aws:lambda:eu-west-1:123456789012:function:top-task",
    ]);
  });
});
