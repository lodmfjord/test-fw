import { beforeEach, describe, expect, it } from "bun:test";
import { createSqsQueue, listDefinedSqsListeners, resetDefinedSqsListeners } from "@babbstack/sqs";
import { schema } from "@babbstack/schema";
import { buildContractFromEndpoints } from "./build-contract-from-endpoints";
import { definePost } from "./define-post";
import { listDefinedEndpoints } from "./list-defined-endpoints";
import { renderTerraformFiles } from "./render-terraform-files";
import { resetDefinedEndpoints } from "./reset-defined-endpoints";

describe("renderTerraformFiles sqs", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
    resetDefinedSqsListeners();
  });

  it("renders sqs queue resources, sender permissions, and listener lambda mappings", () => {
    const ble = createSqsQueue(
      {
        parse(input: unknown) {
          const source = input as { userId?: unknown };
          if (typeof source.userId !== "string") {
            throw new Error("invalid message");
          }

          return {
            userId: source.userId,
          };
        },
      },
      {
        queueName: "ble-events",
      },
    );

    definePost({
      path: "/ble",
      context: {
        sqs: {
          handler: ble,
        },
      },
      handler: async ({ body, sqs }) => {
        if (!sqs) {
          throw new Error("missing sqs");
        }
        await sqs.send({
          userId: body.userId,
        });
        return {
          value: {
            ok: true,
          },
        };
      },
      request: {
        body: schema.object({
          userId: schema.string(),
        }),
      },
      response: schema.object({
        ok: schema.boolean(),
      }),
    });

    ble.addListener({
      handler: async ({ message }) => {
        const userId = message.userId;
        if (!userId) {
          throw new Error("missing user id");
        }
      },
      listenerId: "ble_events_listener",
    });

    const endpoints = listDefinedEndpoints();
    const listeners = listDefinedSqsListeners();
    const contract = buildContractFromEndpoints({
      apiName: "terraform-sqs-test",
      endpoints,
      version: "1.0.0",
    });

    const files = renderTerraformFiles(contract, endpoints, listeners, {
      appName: "test-app",
      prefix: "babbstack",
      region: "eu-west-1",
      resources: {
        apiGateway: false,
        dynamodb: false,
        lambdas: true,
        sqs: true,
      },
    });

    const sqsSource = files["sqs.tf.json"] ?? "";
    const lambdaSource = files["lambdas.tf.json"] ?? "";

    expect(Object.keys(files).sort((left, right) => left.localeCompare(right))).toEqual([
      "lambdas.tf.json",
      "provider.tf.json",
      "sqs.tf.json",
    ]);
    expect(sqsSource.includes('"aws_sqs_queue"')).toBe(true);
    expect(lambdaSource.includes('"aws_lambda_event_source_mapping"')).toBe(true);
    expect(lambdaSource.includes('"sqs:SendMessage"')).toBe(true);
    expect(lambdaSource.includes("sqs:ReceiveMessage")).toBe(true);
    expect(lambdaSource.includes('"SIMPLE_API_SQS_QUEUE_NAME_PREFIX"')).toBe(true);
  });
});
