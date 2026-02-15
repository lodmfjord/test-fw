/** @fileoverview Implements route execution types. @module libs/http-api-contract/src/route-execution-types */
import type {
  StepFunctionDefinition,
  StepFunctionDefinitionInput,
} from "@babbstack/step-functions";

export type StepFunctionInvocationType = "sync" | "async";

export type StepFunctionWorkflowType = "STANDARD" | "EXPRESS";

export type RouteStepFunctionExecutionInput = {
  definition: StepFunctionDefinitionInput;
  invocationType?: StepFunctionInvocationType;
  kind: "step-function";
  stateMachineName: string;
  workflowType?: StepFunctionWorkflowType;
};

export type RouteLambdaExecutionInput = {
  kind?: "lambda";
};

export type RouteExecutionInput = RouteLambdaExecutionInput | RouteStepFunctionExecutionInput;

export type RouteStepFunctionExecution = {
  definition: StepFunctionDefinition;
  definitionJson: string;
  invocationType: StepFunctionInvocationType;
  kind: "step-function";
  stateMachineName: string;
  workflowType: StepFunctionWorkflowType;
};

export type RouteExecution =
  | {
      kind: "lambda";
    }
  | RouteStepFunctionExecution;
