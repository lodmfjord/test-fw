import type { EndpointRuntimeDefinition } from "./types";

type LambdaDynamodbAccess = {
  actions: string[];
  table_key: string;
  table_name: string;
};

const DYNAMODB_READ_ACTIONS = [
  "dynamodb:BatchGetItem",
  "dynamodb:ConditionCheckItem",
  "dynamodb:DescribeTable",
  "dynamodb:GetItem",
  "dynamodb:Query",
  "dynamodb:Scan",
];
const DYNAMODB_WRITE_ACTIONS = [
  "dynamodb:BatchWriteItem",
  "dynamodb:DeleteItem",
  "dynamodb:PutItem",
  "dynamodb:UpdateItem",
];

function toTableKey(tableName: string): string {
  return tableName.replace(/[^a-zA-Z0-9_]/g, "_");
}

export function toRouteDynamodbAccess(
  endpoints: ReadonlyArray<EndpointRuntimeDefinition>,
): Record<string, LambdaDynamodbAccess> {
  const accessByRoute = new Map<string, LambdaDynamodbAccess>();

  for (const endpoint of endpoints) {
    const runtime = endpoint.context?.database?.runtime;
    if (!runtime) {
      continue;
    }

    const mode = endpoint.context?.database?.access.includes("write") ? "write" : "read";
    accessByRoute.set(endpoint.routeId, {
      actions:
        mode === "write"
          ? [...DYNAMODB_READ_ACTIONS, ...DYNAMODB_WRITE_ACTIONS]
          : [...DYNAMODB_READ_ACTIONS],
      table_key: toTableKey(runtime.tableName),
      table_name: runtime.tableName,
    });
  }

  const sortedEntries = [...accessByRoute.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  );
  return Object.fromEntries(sortedEntries);
}
