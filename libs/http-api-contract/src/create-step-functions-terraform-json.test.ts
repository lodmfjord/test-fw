/**
 * @fileoverview Tests createStepFunctionsTerraformJson behavior.
 */
import { describe, expect, it } from "bun:test";
import { createStepFunctionsTerraformJson } from "./create-step-functions-terraform-json";

describe("createStepFunctionsTerraformJson", () => {
  const terraformRegion = "$" + "{var.aws_region}";
  const terraformAccountId = "$" + "{data.aws_caller_identity.current.account_id}";

  it("renders locals for endpoint and listener state machines", () => {
    const terraformJson = createStepFunctionsTerraformJson(
      [
        {
          execution: {
            definitionJson: "{}",
            invocationType: "sync",
            kind: "step-function",
            stateMachineName: "orders-flow",
            workflowType: "STANDARD",
          },
          method: "POST",
          path: "/orders",
          routeId: "post_orders",
        } as never,
      ],
      [
        {
          listenerId: "orders_listener",
          queue: {
            runtime: {
              queueName: "orders-queue",
            },
          },
          target: {
            definitionJson: "{}",
            invocationType: "async",
            kind: "step-function",
            stateMachineName: "orders-listener-flow",
            workflowType: "STANDARD",
          },
        } as never,
      ],
      true,
      true,
    ) as {
      locals: {
        step_function_endpoints: Record<string, unknown>;
        step_function_sqs_listeners: Record<string, unknown>;
      };
    };

    expect(terraformJson.locals.step_function_endpoints.post_orders).toBeDefined();
    expect(terraformJson.locals.step_function_sqs_listeners.orders_listener).toBeDefined();
  });

  it("rewrites local lambda task resources to deployable lambda arns", () => {
    const expectedForEach = `$${"{{for key, value in local.step_function_endpoints : key => value if length(value.lambda_resource_arns) > 0}}"}`;
    const expectedPolicy = `$${'{jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = ["lambda:InvokeFunction"], Resource = each.value.lambda_resource_arns }] })}'}`;
    const terraformJson = createStepFunctionsTerraformJson(
      [
        {
          execution: {
            definitionJson: JSON.stringify({
              StartAt: "RunTask",
              States: {
                RunTask: {
                  End: true,
                  Resource: "lambda:generate-random-number",
                  Type: "Task",
                },
              },
            }),
            invocationType: "sync",
            kind: "step-function",
            stateMachineName: "orders-flow",
            workflowType: "EXPRESS",
          },
          method: "POST",
          path: "/orders",
          routeId: "post_orders",
        } as never,
      ],
      [],
      false,
      false,
    ) as {
      data?: {
        aws_caller_identity?: {
          current: Record<string, unknown>;
        };
      };
      locals: {
        step_function_endpoints: Record<
          string,
          { definition: string; lambda_resource_arns?: string[] }
        >;
      };
      resource: {
        aws_iam_role_policy?: {
          step_function_route_lambda_invoke?: {
            for_each: string;
            name: string;
            policy: string;
            role: string;
          };
        };
      };
    };

    expect(terraformJson.locals.step_function_endpoints.post_orders?.definition).toContain(
      `arn:aws:lambda:${terraformRegion}:${terraformAccountId}:function:generate-random-number`,
    );
    expect(terraformJson.locals.step_function_endpoints.post_orders?.lambda_resource_arns).toEqual([
      `arn:aws:lambda:${terraformRegion}:${terraformAccountId}:function:generate-random-number`,
    ]);
    expect(
      terraformJson.resource.aws_iam_role_policy?.step_function_route_lambda_invoke,
    ).toMatchObject({
      for_each: expectedForEach,
      policy: expectedPolicy,
    });
    expect(terraformJson.data?.aws_caller_identity?.current).toBeDefined();
  });

  it("uses distinct default prefixes for step-function iam role and policy names", () => {
    const terraformJson = createStepFunctionsTerraformJson(
      [
        {
          execution: {
            definitionJson: "{}",
            invocationType: "sync",
            kind: "step-function",
            stateMachineName: "orders-flow",
            workflowType: "EXPRESS",
          },
          method: "POST",
          path: "/orders",
          routeId: "post_orders",
        } as never,
      ],
      [
        {
          listenerId: "orders_listener",
          queue: {
            runtime: {
              queueName: "orders-queue",
            },
          },
          target: {
            definitionJson: "{}",
            invocationType: "async",
            kind: "step-function",
            stateMachineName: "orders-listener-flow",
            workflowType: "EXPRESS",
          },
        } as never,
      ],
      true,
      true,
    ) as {
      variable: Record<string, { default: string; type: string }>;
    };

    expect(terraformJson.variable.step_function_state_machine_role_name_prefix?.default).toBe(
      "sfn-",
    );
    expect(terraformJson.variable.apigateway_step_function_role_name_prefix?.default).toBe(
      "apigw-",
    );
    expect(terraformJson.variable.pipes_step_function_role_name_prefix?.default).toBe("pipes-");
    expect(terraformJson.variable.apigateway_step_function_policy_name_prefix?.default).toBe(
      "apigw-",
    );
    expect(terraformJson.variable.pipes_step_function_source_policy_name_prefix?.default).toBe(
      "pipes-src-",
    );
    expect(terraformJson.variable.pipes_step_function_target_policy_name_prefix?.default).toBe(
      "pipes-tgt-",
    );
    expect(terraformJson.variable.step_function_lambda_invoke_policy_name_prefix?.default).toBe(
      "sfn-lambda-",
    );
  });

  it("uses non-empty fallback prefixes in iam role names when variables are empty", () => {
    const terraformJson = createStepFunctionsTerraformJson(
      [
        {
          execution: {
            definitionJson: "{}",
            invocationType: "sync",
            kind: "step-function",
            stateMachineName: "orders-flow",
            workflowType: "EXPRESS",
          },
          method: "POST",
          path: "/orders",
          routeId: "post_orders",
        } as never,
      ],
      [
        {
          listenerId: "orders_listener",
          queue: {
            runtime: {
              queueName: "orders-queue",
            },
          },
          target: {
            definitionJson: "{}",
            invocationType: "async",
            kind: "step-function",
            stateMachineName: "orders-listener-flow",
            workflowType: "EXPRESS",
          },
        } as never,
      ],
      true,
      true,
    ) as {
      resource: {
        aws_iam_role: Record<string, { name: string }>;
      };
    };

    expect(terraformJson.resource.aws_iam_role.step_function_route?.name).toContain(
      'var.step_function_state_machine_role_name_prefix != "" ? var.step_function_state_machine_role_name_prefix : "sfn-"',
    );
    expect(terraformJson.resource.aws_iam_role.pipes_step_function_sqs_listener?.name).toContain(
      'var.pipes_step_function_role_name_prefix != "" ? var.pipes_step_function_role_name_prefix : "pipes-"',
    );
    expect(terraformJson.resource.aws_iam_role.apigateway_step_function_route?.name).toContain(
      'var.apigateway_step_function_role_name_prefix != "" ? var.apigateway_step_function_role_name_prefix : "apigw-"',
    );
  });
});
