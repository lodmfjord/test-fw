/**
 * @fileoverview Tests toDeployableStepFunctionDefinitionJson behavior.
 */
import { describe, expect, it } from "bun:test";
import { toDeployableStepFunctionDefinitionJson } from "./to-deployable-step-function-definition-json";

describe("toDeployableStepFunctionDefinitionJson", () => {
  const terraformRegion = "$" + "{var.aws_region}";
  const terraformAccountId = "$" + "{data.aws_caller_identity.current.account_id}";

  it("rewrites lambda shortcut task resources to lambda arns", () => {
    const deployableDefinitionJson = toDeployableStepFunctionDefinitionJson(
      JSON.stringify({
        StartAt: "RunTask",
        States: {
          RunTask: {
            End: true,
            Resource: "lambda:generate-random-number",
            Type: "Task",
          },
        },
      }),
    );

    expect(deployableDefinitionJson).toContain(
      `arn:aws:lambda:${terraformRegion}:${terraformAccountId}:function:generate-random-number`,
    );
  });

  it("keeps non-lambda shortcut task resources unchanged", () => {
    const deployableDefinitionJson = toDeployableStepFunctionDefinitionJson(
      JSON.stringify({
        StartAt: "RunTask",
        States: {
          RunTask: {
            End: true,
            Resource: "arn:aws:states:::lambda:invoke",
            Type: "Task",
          },
        },
      }),
    );

    expect(deployableDefinitionJson).toContain('"Resource":"arn:aws:states:::lambda:invoke"');
  });
});
