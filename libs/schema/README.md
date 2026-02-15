# @babbstack/schema

Schema primitives used by the framework for:

- request/response validation
- JSON Schema generation for OpenAPI and contracts
- runtime parsing with clear field-path error messages

## Exports

- `schema`: schema builder
- types: `Schema`, `JsonSchema`

## Builder Methods

- `schema.string()`
- `schema.number()`
- `schema.boolean()`
- `schema.array(itemSchema)`
- `schema.object(shape)`
- `schema.optional(innerSchema)`
- `schema.fromZod(zodSchema)`

## Example

```ts
import { schema } from "@babbstack/schema";

const createUserBody = schema.object({
  email: schema.string(),
  age: schema.optional(schema.number()),
});

const parsed = createUserBody.parse({
  age: 30,
  email: "user@example.com",
});
```

## Build

```bash
bun run --cwd libs/schema build
```
