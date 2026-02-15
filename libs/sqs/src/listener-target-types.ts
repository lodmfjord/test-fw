/**
 * @fileoverview Implements listener target types.
 */
import type {
  StepFunctionDefinition,
  StepFunctionDefinitionInput,
} from "@babbstack/step-functions";

export type SqsStepFunctionInvocationType = "sync" | "async";

export type SqsStepFunctionWorkflowType = "STANDARD" | "EXPRESS";

export type SqsListenerStepFunctionTargetInput = {
  definition: StepFunctionDefinitionInput;
  invocationType?: SqsStepFunctionInvocationType;
  kind: "step-function";
  stateMachineName: string;
  workflowType?: SqsStepFunctionWorkflowType;
};

export type SqsListenerLambdaTargetInput = {
  kind?: "lambda";
};

export type SqsListenerTargetInput =
  | SqsListenerLambdaTargetInput
  | SqsListenerStepFunctionTargetInput;

export type SqsListenerStepFunctionTarget = {
  definition: StepFunctionDefinition;
  definitionJson: string;
  invocationType: SqsStepFunctionInvocationType;
  kind: "step-function";
  stateMachineName: string;
  workflowType: SqsStepFunctionWorkflowType;
};

export type SqsListenerTarget =
  | {
      kind: "lambda";
    }
  | SqsListenerStepFunctionTarget;
