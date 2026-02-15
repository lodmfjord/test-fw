/**
 * @fileoverview Tests renderLambdaRuntimeEntrySource behavior.
 */
import { describe, expect, it } from "bun:test";
import { schema } from "@babbstack/schema";
import { renderLambdaRuntimeEntrySource } from "./render-lambda-runtime-entry";

/** Trims a route parameter value. */
const normalize = (value: string): string => value.trim();

describe("renderLambdaRuntimeEntrySource", () => {
  it("renders runtime entry source with used imports and runtime scaffolding", () => {
    const responseSchema = schema.object({ id: schema.string() });
    const endpoint = {
      access: { db: "read" },
      auth: "none",
      context: {
        database: {
          access: ["read"],
          runtime: {
            keyField: "id",
            tableName: "users-table",
          },
        },
        sqs: {
          runtime: {
            queueName: "events-queue",
          },
        },
      },
      execution: { kind: "lambda" },
      handler: ({ params }: { params: { id: string } }) => ({
        value: { id: normalize(params.id) },
      }),
      handlerId: "get_users_param_id_handler",
      method: "GET",
      operationId: "getUsers",
      path: "/users/{id}",
      request: {
        params: schema.object({ id: schema.string() }),
      },
      response: responseSchema,
      responseByStatusCode: {
        "200": responseSchema,
      },
      routeId: "get_users_param_id",
      successStatusCode: 200,
      tags: [],
    };

    const source = renderLambdaRuntimeEntrySource(
      "/tmp/endpoints.ts",
      'import { normalize } from "./helpers";\nimport { ignored } from "./ignored";',
      endpoint as never,
    );

    expect(source).toContain("import { normalize } from ");
    expect(source).toContain("/tmp/helpers");
    expect(source).not.toContain('from "./ignored"');
    expect(source).toContain('const endpointRouteId = "get_users_param_id";');
    expect(source).toContain("await ensureEndpointEnvLoaded();");
    expect(source).toContain("export async function handler(event)");
  });

  it("throws when endpoint has no lambda handler", () => {
    const responseSchema = schema.object({ ok: schema.boolean() });

    expect(() =>
      renderLambdaRuntimeEntrySource("/tmp/endpoints.ts", "", {
        method: "GET",
        path: "/health",
        request: {},
        response: responseSchema,
        responseByStatusCode: {
          "200": responseSchema,
        },
        routeId: "get_health",
        successStatusCode: 200,
      } as never),
    ).toThrow("Endpoint get_health is missing a lambda handler");
  });

  it("renders step-function runtime wrapper without requiring endpoint.handler", () => {
    const responseSchema = schema.object({ ok: schema.boolean() });

    const source = renderLambdaRuntimeEntrySource("/tmp/endpoints.ts", "", {
      execution: {
        definition: {
          StartAt: "Done",
          States: {
            Done: {
              End: true,
              Result: {
                ok: true,
              },
              Type: "Pass",
            },
          },
        },
        definitionJson: JSON.stringify({
          StartAt: "Done",
          States: {
            Done: {
              End: true,
              Result: {
                ok: true,
              },
              Type: "Pass",
            },
          },
        }),
        invocationType: "sync",
        kind: "step-function",
        stateMachineName: "demo-state-machine",
        workflowType: "STANDARD",
      },
      method: "POST",
      path: "/step-function-demo",
      request: {
        body: schema.object({
          value: schema.string(),
        }),
      },
      response: responseSchema,
      responseByStatusCode: {
        "200": responseSchema,
      },
      routeId: "post_step_function_demo",
      successStatusCode: 200,
    } as never);

    expect(source).toContain("runStepFunctionEndpoint");
    expect(source).toContain("simpleApiExecuteStepFunctionDefinition");
    expect(source).toContain("stepFunctionResult.output");
  });
});
