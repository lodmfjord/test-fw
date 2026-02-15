/**
 * @fileoverview Implements create sqs terraform json.
 */
import type { SqsListenerRuntimeDefinition } from "@babbstack/sqs";
import { toSqsQueues } from "./to-sqs-queues";
import type { EndpointRuntimeDefinition } from "./types";
import type { TerraformJson } from "./terraform-render-types";

/** Converts to terraform reference. */
function toTerraformReference(expression: string): string {
  return `\${${expression}}`;
}

/**
 * Creates sqs terraform json.
 * @param endpoints - Endpoints parameter.
 * @param listeners - Listeners parameter.
 * @example
 * createSqsTerraformJson(endpoints, listeners)
 * @returns Output value.
 */
export function createSqsTerraformJson(
  endpoints: ReadonlyArray<EndpointRuntimeDefinition>,
  listeners: ReadonlyArray<SqsListenerRuntimeDefinition>,
): TerraformJson {
  return {
    locals: {
      sqs_queues: toSqsQueues(endpoints, listeners),
    },
    resource: {
      aws_sqs_queue: {
        queue: {
          for_each: toTerraformReference("local.sqs_queues"),
          name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.sqs_queue_name_prefix")}${toTerraformReference("each.value.name")}`,
        },
      },
    },
    variable: {
      sqs_queue_name_prefix: { default: "", type: "string" },
    },
  };
}
