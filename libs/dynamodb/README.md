# `@babbstack/dynamodb`

DynamoDB adapters for babbstack endpoint runtimes.

- `createMemoryDynamoDb()`: in-memory fake DB for local development/tests.
- `createAwsDynamoDb()`: AWS DynamoDB-backed DB (loads AWS SDK dynamically).
- `createRuntimeDynamoDb()`: selects AWS in Lambda runtime, memory otherwise.
- `defineDynamoDbTable()`: define table structure and key fields.
- `createTypedDynamoDb()`: build type-safe table clients (`get`, `insert`, `update`, `remove`).

## Type-safe table example

```ts
import {
  createRuntimeDynamoDb,
  createTypedDynamoDb,
  defineDynamoDbTable,
} from "@babbstack/dynamodb";

type UserItem = {
  id: string;
  name: string;
  role: "admin" | "user";
};

const usersTable = defineDynamoDbTable<UserItem, "id">({
  keyFields: ["id"],
  tableName: "users",
});

const db = createTypedDynamoDb(createRuntimeDynamoDb(), {
  users: usersTable,
});

const user = await db.users.get({ id: "user-1" });
await db.users.insert({ id: "user-1", name: "sam", role: "user" });
await db.users.update({ id: "user-1" }, { name: "max" });
await db.users.remove({ id: "user-1" });
```
