/** @fileoverview Implements to step function sqs listeners. @module libs/http-api-contract/src/to-step-function-sqs-listeners */
import type { SqsListenerRuntimeDefinition } from "@babbstack/sqs";

type StepFunctionSqsListenerConfig = {
  batch_size: number;
  definition: string;
  invocation_type: "sync" | "async";
  pipe_invocation_type: "REQUEST_RESPONSE" | "FIRE_AND_FORGET";
  queue_key: string;
  queue_name: string;
  start_action: "states:StartExecution" | "states:StartSyncExecution";
  state_machine_name: string;
  workflow_type: "STANDARD" | "EXPRESS";
};

/** Converts values to queue key. */
function toQueueKey(queueName: string): string {
  return queueName.replace(/[^a-zA-Z0-9_]/g, "_");
}

/** Converts values to pipe invocation type. */
function toPipeInvocationType(
  invocationType: "sync" | "async",
): StepFunctionSqsListenerConfig["pipe_invocation_type"] {
  if (invocationType === "sync") {
    return "REQUEST_RESPONSE";
  }

  return "FIRE_AND_FORGET";
}

/** Converts values to start action. */
function toStartAction(
  invocationType: "sync" | "async",
): StepFunctionSqsListenerConfig["start_action"] {
  if (invocationType === "sync") {
    return "states:StartSyncExecution";
  }

  return "states:StartExecution";
}

/** Converts values to step function sqs listeners. @example `toStepFunctionSqsListeners(input)` */
export function toStepFunctionSqsListeners(
  listeners: ReadonlyArray<SqsListenerRuntimeDefinition>,
): Record<string, StepFunctionSqsListenerConfig> {
  const sortedListeners = listeners
    .filter((listener) => listener.target?.kind === "step-function")
    .sort((left, right) => left.listenerId.localeCompare(right.listenerId));

  return Object.fromEntries(
    sortedListeners.map((listener) => {
      const target = listener.target;
      if (!target || target.kind !== "step-function") {
        throw new Error(`Expected step-function listener target for ${listener.listenerId}`);
      }

      return [
        listener.listenerId,
        {
          batch_size: listener.aws?.batchSize ?? 10,
          definition: target.definitionJson,
          invocation_type: target.invocationType,
          pipe_invocation_type: toPipeInvocationType(target.invocationType),
          queue_key: toQueueKey(listener.queue.runtime.queueName),
          queue_name: listener.queue.runtime.queueName,
          start_action: toStartAction(target.invocationType),
          state_machine_name: target.stateMachineName,
          workflow_type: target.workflowType,
        },
      ];
    }),
  );
}
