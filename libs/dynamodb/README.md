# @babbstack/dynamodb

DynamoDB adapters and typed table helpers for babbstack runtimes.

## Exports

- clients: `createMemoryDynamoDb`, `createAwsDynamoDb`, `createRuntimeDynamoDb`
- table helpers: `defineDynamoDbTable`, `createTypedDynamoDb`
- access wrappers: `createDynamoDatabase`

## Runtime Selection

`createRuntimeDynamoDb()` selects AWS-backed DynamoDB in Lambda runtime and memory-backed DynamoDB outside Lambda.

## Type-Safe Table Example

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

await db.users.insert({ id: "user-1", name: "sam", role: "user" });
const user = await db.users.get({ id: "user-1" });
await db.users.update({ id: "user-1" }, { name: "max" });
await db.users.remove({ id: "user-1" });
```

## Build

```bash
bun run --cwd libs/dynamodb build
```
