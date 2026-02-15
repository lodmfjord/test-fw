/**
 * @fileoverview Tests toLambdaRuntimeSourceContext behavior.
 */
import { describe, expect, it } from "bun:test";
import { schema } from "@babbstack/schema";
import { toLambdaRuntimeSourceContext } from "./render-lambda-runtime-source-context";

describe("toLambdaRuntimeSourceContext", () => {
  it("includes db and sqs runtime wiring when endpoint or handler uses those contexts", () => {
    const responseSchema = schema.object({ ok: schema.boolean() });
    const context = toLambdaRuntimeSourceContext(
      {
        access: { db: "read" },
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
        request: {
          body: schema.object({ input: schema.string() }),
        },
        response: responseSchema,
        responseByStatusCode: {
          "200": responseSchema,
        },
      } as never,
      "({ db, sqs }) => ({ value: { ok: Boolean(db) && Boolean(sqs) } })",
      ['import { helper } from "./helper";'],
      "@runtime/db",
      "@runtime/sqs",
    );

    expect(context.prelude).toContain('import { z as simpleApiZod } from "zod";');
    expect(context.prelude).toContain(
      'import { Logger as simpleApiPowertoolsLogger } from "@aws-lambda-powertools/logger";',
    );
    expect(context.prelude).toContain('import { helper } from "./helper";');
    expect(context.prelude).toContain("@runtime/db");
    expect(context.prelude).toContain("@runtime/sqs");
    expect(context.runtimeDbState).toContain("createSimpleApiRuntimeDynamoDb");
    expect(context.runtimeSqsState).toContain("createSimpleApiRuntimeSqs");
    expect(context.endpointDatabaseBinding).toContain("toDatabaseForContext");
    expect(context.endpointSqsBinding).toContain("toSqsForContext");
  });

  it("omits runtime db and sqs wiring when unused", () => {
    const responseSchema = schema.object({ ok: schema.boolean() });
    const context = toLambdaRuntimeSourceContext(
      {
        request: {},
        response: responseSchema,
        responseByStatusCode: {
          "200": responseSchema,
        },
      } as never,
      "() => ({ value: { ok: true } })",
      [],
      "@runtime/db",
      "@runtime/sqs",
    );

    expect(context.runtimeDbState).toBe("");
    expect(context.runtimeSqsState).toBe("");
    expect(context.endpointDbLine).toBe("const endpointDb = undefined;");
    expect(context.endpointDatabaseValue).toBe("undefined");
    expect(context.endpointSqsValue).toBe("undefined");
  });
});
