/**
 * @fileoverview Tests createDynamodbTerraformJson behavior.
 */
import { describe, expect, it } from "bun:test";
import { createDynamodbTerraformJson } from "./create-dynamodb-terraform-json";

describe("createDynamodbTerraformJson", () => {
  it("renders dynamodb table locals and resources", () => {
    const terraformJson = createDynamodbTerraformJson([
      {
        context: {
          database: {
            runtime: {
              keyField: "id",
              tableName: "users-table",
            },
          },
        },
      } as never,
    ]) as {
      locals: {
        dynamodb_tables: Record<string, { hash_key: string; name: string }>;
      };
    };

    expect(terraformJson.locals.dynamodb_tables).toEqual({
      users_table: {
        hash_key: "id",
        name: "users-table",
      },
    });
  });
});
