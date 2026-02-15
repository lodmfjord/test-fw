/**
 * @fileoverview Rewrites step-function definition JSON for deploy-time Terraform compatibility.
 */

type StepFunctionDefinitionSource = {
  States?: Record<string, unknown>;
};

/** Converts to terraform reference. */
function toTerraformReference(expression: string): string {
  return `\${${expression}}`;
}

/** Converts to deployable task resource. */
function toDeployableTaskResource(resource: string): string {
  const trimmedResource = resource.trim();
  if (!trimmedResource.startsWith("lambda:")) {
    return trimmedResource;
  }

  const lambdaName = trimmedResource.slice("lambda:".length).trim();
  if (lambdaName.length === 0) {
    throw new Error(`Step-function Task Resource "${resource}" is invalid`);
  }

  return `arn:aws:lambda:${toTerraformReference("var.aws_region")}:${toTerraformReference("data.aws_caller_identity.current.account_id")}:function:${lambdaName}`;
}

/** Converts to deployable state. */
function toDeployableState(state: unknown): unknown {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    return state;
  }

  const typedState = state as {
    Resource?: string;
    Type?: string;
  };

  if (typedState.Type !== "Task" || typeof typedState.Resource !== "string") {
    return state;
  }

  return {
    ...typedState,
    Resource: toDeployableTaskResource(typedState.Resource),
  };
}

/**
 * Creates deployable step-function definition JSON.
 * @param definitionJson - Definition JSON parameter.
 * @example
 * toDeployableStepFunctionDefinitionJson(definitionJson)
 * @returns Output value.
 * @throws Error when definition JSON is invalid.
 */
export function toDeployableStepFunctionDefinitionJson(definitionJson: string): string {
  const parsedDefinition = JSON.parse(definitionJson) as StepFunctionDefinitionSource;
  if (
    !parsedDefinition ||
    typeof parsedDefinition !== "object" ||
    Array.isArray(parsedDefinition)
  ) {
    throw new Error("Step-function definition JSON must be an object");
  }

  if (!parsedDefinition.States || typeof parsedDefinition.States !== "object") {
    return definitionJson;
  }

  const states = parsedDefinition.States;
  return JSON.stringify({
    ...parsedDefinition,
    States: Object.fromEntries(
      Object.entries(states).map(([stateName, state]) => [stateName, toDeployableState(state)]),
    ),
  });
}
