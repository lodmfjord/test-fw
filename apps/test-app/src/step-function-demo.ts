/**
 * @fileoverview Implements step function demo.
 */
import { createSqsQueue } from "@babbstack/sqs";
import { definePost, defineStepFunction } from "@babbstack/http-api-contract";
import { schema } from "@babbstack/schema";

const demoStepFunctionDefinition = defineStepFunction({
  StartAt: "ReturnOutput",
  States: {
    ReturnOutput: {
      Type: "Pass",
      Result: {
        ok: true,
        source: "step-function",
      },
      End: true,
    },
  },
});

const randomBranchStepFunctionDefinition = defineStepFunction({
  StartAt: "GenerateRandom",
  States: {
    GenerateRandom: {
      Type: "Task",
      Resource: "lambda:generate-random-number",
      handler: () => Math.floor(Math.random() * 100) + 1,
      ResultPath: "$.random",
      Next: "BranchOnRandom",
    },
    BranchOnRandom: {
      Type: "Choice",
      Choices: [
        {
          Variable: "$.random",
          NumericLessThan: 51,
          Next: "HandleLowNumber",
        },
        {
          Variable: "$.random",
          NumericGreaterThan: 50,
          Next: "HandleHighNumber",
        },
      ],
    },
    HandleLowNumber: {
      Type: "Task",
      Resource: "lambda:handle-low-number",
      handler: (input) => {
        const payload = input as { random?: number };
        const random = payload.random ?? 0;
        return {
          branch: "low",
          message: `generated ${random}, so branch is low (< 51)`,
          random,
        };
      },
      End: true,
    },
    HandleHighNumber: {
      Type: "Task",
      Resource: "lambda:handle-high-number",
      handler: (input) => {
        const payload = input as { random?: number };
        const random = payload.random ?? 0;
        return {
          branch: "high",
          message: `generated ${random}, so branch is high (> 50)`,
          random,
        };
      },
      End: true,
    },
  },
});

const stepFunctionEventsQueue = createSqsQueue(
  {
    parse(input) {
      const source = input as { eventId?: unknown };
      if (typeof source.eventId !== "string") {
        throw new Error("invalid eventId");
      }

      return {
        eventId: source.eventId,
      };
    },
  },
  {
    queueName: "step-function-events",
  },
);

stepFunctionEventsQueue.addListener({
  listenerId: "step_function_events",
  target: {
    definition: demoStepFunctionDefinition,
    invocationType: "async",
    kind: "step-function",
    stateMachineName: "step-function-events-listener",
  },
});

const postStepFunctionDemoEndpoint = definePost({
  execution: {
    definition: demoStepFunctionDefinition,
    kind: "step-function",
    stateMachineName: "step-function-demo-endpoint",
  },
  path: "/step-function-demo",
  request: {
    body: schema.object({
      value: schema.string(),
    }),
  },
  response: schema.object({
    ok: schema.boolean(),
    source: schema.string(),
  }),
  tags: ["step-function-demo"],
});

const postStepFunctionRandomBranchEndpoint = definePost({
  execution: {
    definition: randomBranchStepFunctionDefinition,
    kind: "step-function",
    stateMachineName: "step-function-random-branch-endpoint",
  },
  path: "/step-function-random-branch",
  response: schema.object({
    branch: schema.string(),
    message: schema.string(),
    random: schema.number(),
  }),
  tags: ["step-function-demo"],
});

const postStepFunctionEventsEndpoint = definePost({
  path: "/step-function-events",
  context: {
    sqs: {
      handler: stepFunctionEventsQueue,
    },
  },
  handler: async ({ body, sqs }) => {
    if (!sqs) {
      throw new Error("missing sqs context");
    }

    await sqs.send({
      eventId: body.eventId,
    });

    return {
      value: {
        accepted: true,
        eventId: body.eventId,
      },
    };
  },
  request: {
    body: schema.object({
      eventId: schema.string(),
    }),
  },
  response: schema.object({
    accepted: schema.boolean(),
    eventId: schema.string(),
  }),
  tags: ["step-function-demo"],
});

const stepFunctionDemoEndpoints = [
  postStepFunctionDemoEndpoint,
  postStepFunctionEventsEndpoint,
  postStepFunctionRandomBranchEndpoint,
];

export { stepFunctionDemoEndpoints };
