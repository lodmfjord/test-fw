/**
 * @fileoverview Tests toRouteDynamodbAccess behavior.
 */
import { describe, expect, it } from "bun:test";
import { toRouteDynamodbAccess } from "./to-lambda-terraform-metadata";

describe("toRouteDynamodbAccess", () => {
  it("maps read/write dynamodb permissions by route", () => {
    const access = toRouteDynamodbAccess([
      {
        context: {
          database: {
            access: ["read"],
            runtime: {
              keyField: "id",
              tableName: "users-table",
            },
          },
        },
        execution: { kind: "lambda" },
        routeId: "get_users",
      } as never,
      {
        context: {
          database: {
            access: ["read", "write"],
            runtime: {
              keyField: "id",
              tableName: "orders-table",
            },
          },
        },
        execution: { kind: "lambda" },
        routeId: "post_orders",
      } as never,
    ]);

    expect(access.get_users?.actions).toEqual(expect.arrayContaining(["dynamodb:GetItem"]));
    expect(access.get_users?.actions).not.toEqual(expect.arrayContaining(["dynamodb:PutItem"]));
    expect(access.post_orders?.actions).toEqual(expect.arrayContaining(["dynamodb:PutItem"]));
  });
});
