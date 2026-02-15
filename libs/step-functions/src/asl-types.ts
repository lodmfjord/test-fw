/**
 * @fileoverview Implements asl types.
 */
export type StepFunctionJsonPath = "$" | `$.${string}`;

export type StepFunctionJsonPathOrNull = StepFunctionJsonPath | null;

export type StepFunctionResultPath = StepFunctionJsonPath | null;

type StepFunctionTransition =
  | {
      End: true;
      Next?: never;
    }
  | {
      End?: never;
      Next: string;
    };

export type StepFunctionPassState = StepFunctionTransition & {
  Comment?: string;
  InputPath?: StepFunctionJsonPathOrNull;
  OutputPath?: StepFunctionJsonPathOrNull;
  Result?: unknown;
  ResultPath?: StepFunctionResultPath;
  Type: "Pass";
};

export type StepFunctionTaskState = StepFunctionTransition & {
  Comment?: string;
  handler?: StepFunctionTaskHandler;
  InputPath?: StepFunctionJsonPathOrNull;
  OutputPath?: StepFunctionJsonPathOrNull;
  Resource: string;
  ResultPath?: StepFunctionResultPath;
  Type: "Task";
};

export type StepFunctionChoiceRule = {
  Next: string;
  NumericGreaterThan?: number;
  NumericGreaterThanEquals?: number;
  NumericLessThan?: number;
  NumericLessThanEquals?: number;
  Variable: StepFunctionJsonPath;
};

export type StepFunctionChoiceState = {
  Choices: StepFunctionChoiceRule[];
  Comment?: string;
  Default?: string;
  Type: "Choice";
};

export type StepFunctionSucceedState = {
  Comment?: string;
  Type: "Succeed";
};

export type StepFunctionState =
  | StepFunctionChoiceState
  | StepFunctionPassState
  | StepFunctionSucceedState
  | StepFunctionTaskState;

export type StepFunctionDefinition = {
  Comment?: string;
  StartAt: string;
  States: Record<string, StepFunctionState>;
};

export type StepFunctionDefinitionInput = StepFunctionDefinition | string;

export type StepFunctionExecutionResult = {
  output: unknown;
  status: "SUCCEEDED";
};

export type StepFunctionTaskHandler = (input: unknown) => Promise<unknown> | unknown;

export type ExecuteStepFunctionDefinitionOptions = {
  taskHandlers?: Record<string, StepFunctionTaskHandler>;
};

type StepFunctionPassStateInput = {
  Comment?: string;
  End?: true;
  InputPath?: StepFunctionJsonPathOrNull;
  Next?: string;
  OutputPath?: StepFunctionJsonPathOrNull;
  Result?: unknown;
  ResultPath?: StepFunctionResultPath;
  Type: "Pass";
};

type StepFunctionTaskStateInput = {
  Comment?: string;
  End?: true;
  handler?: StepFunctionTaskHandler;
  InputPath?: StepFunctionJsonPathOrNull;
  Next?: string;
  OutputPath?: StepFunctionJsonPathOrNull;
  Resource: string;
  ResultPath?: StepFunctionResultPath;
  Type: "Task";
};

type StepFunctionChoiceRuleInput = {
  Next: string;
  NumericGreaterThan?: number;
  NumericGreaterThanEquals?: number;
  NumericLessThan?: number;
  NumericLessThanEquals?: number;
  Variable: StepFunctionJsonPath;
};

type StepFunctionChoiceStateInput = {
  Choices: StepFunctionChoiceRuleInput[];
  Comment?: string;
  Default?: string;
  Type: "Choice";
};

export type StepFunctionStateInput =
  | StepFunctionChoiceStateInput
  | StepFunctionPassStateInput
  | StepFunctionSucceedState
  | StepFunctionTaskStateInput;

type ValidateStateNext<
  TStates extends Record<string, StepFunctionStateInput>,
  TState extends StepFunctionStateInput,
> = TState extends {
  Next: infer TNext;
}
  ? TNext extends keyof TStates
    ? TState
    : never
  : TState;

type ValidateStateTransitions<
  TStates extends Record<string, StepFunctionStateInput>,
  TState extends StepFunctionStateInput,
> = ValidateStateNext<TStates, TState>;

export type StepFunctionDefinitionShape<TStates extends Record<string, StepFunctionStateInput>> = {
  Comment?: string;
  StartAt: keyof TStates & string;
  States: {
    [TStateName in keyof TStates]: ValidateStateTransitions<TStates, TStates[TStateName]>;
  };
};
