/**
 * @fileoverview Implements create dynamodb terraform json.
 */
import { toDynamodbTables } from "./to-dynamodb-tables";
import type { EndpointRuntimeDefinition } from "./types";
import type { TerraformJson } from "./terraform-render-types";

/** Converts to terraform reference. */
function toTerraformReference(expression: string): string {
  return `\${${expression}}`;
}

/**
 * Creates dynamodb terraform json.
 * @param endpoints - Endpoints parameter.
 * @example
 * createDynamodbTerraformJson(endpoints)
 * @returns Output value.
 */
export function createDynamodbTerraformJson(
  endpoints: ReadonlyArray<EndpointRuntimeDefinition>,
): TerraformJson {
  return {
    locals: {
      dynamodb_tables: toDynamodbTables(endpoints),
    },
    resource: {
      aws_dynamodb_table: {
        table: {
          attribute: [
            {
              name: toTerraformReference("each.value.hash_key"),
              type: "S",
            },
          ],
          billing_mode: "PAY_PER_REQUEST",
          for_each: toTerraformReference("local.dynamodb_tables"),
          hash_key: toTerraformReference("each.value.hash_key"),
          name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.dynamodb_table_name_prefix")}${toTerraformReference("each.value.name")}`,
        },
      },
    },
    variable: {
      dynamodb_table_name_prefix: { default: "", type: "string" },
    },
  };
}
