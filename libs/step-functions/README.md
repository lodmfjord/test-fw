# @babbstack/step-functions

Typed Step Functions definition and local execution helpers used by babbstack endpoint and SQS integrations.

## Exports

- definition helpers: `defineStepFunction`, `parseStepFunctionDefinition`, `toStepFunctionDefinitionJson`
- execution helpers: `executeStepFunctionDefinition`
- task handler registry: `registerStepFunctionTaskHandler`
- types for ASL state definitions and execution input/output

## Package Export Targets

- `bun`: `./dist/index.js`
- `types`: `./dist/index.d.ts`
- `default`: `./dist/index.js`

## Example

```ts
import { defineStepFunction } from "@babbstack/step-functions";

export const workflow = defineStepFunction({
  StartAt: "ReturnOutput",
  States: {
    ReturnOutput: {
      Type: "Pass",
      Result: {
        ok: true,
      },
      End: true,
    },
  },
});
```

## Build

```bash
bun run --cwd libs/step-functions build
```
