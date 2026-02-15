/**
 * @fileoverview Tests createSqsTerraformJson behavior.
 */
import { describe, expect, it } from "bun:test";
import { createSqsTerraformJson } from "./create-sqs-terraform-json";

describe("createSqsTerraformJson", () => {
  it("renders sqs queue locals from endpoint and listener context", () => {
    const terraformJson = createSqsTerraformJson(
      [
        {
          context: {
            sqs: {
              runtime: {
                queueName: "events-queue",
              },
            },
          },
        } as never,
      ],
      [
        {
          queue: {
            runtime: {
              queueName: "audit-queue",
            },
          },
        } as never,
      ],
    ) as {
      locals: {
        sqs_queues: Record<string, { name: string }>;
      };
    };

    expect(terraformJson.locals.sqs_queues).toEqual({
      audit_queue: { name: "audit-queue" },
      events_queue: { name: "events-queue" },
    });
  });
});
