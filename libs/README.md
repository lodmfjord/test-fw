# libs

Shared reusable framework packages live in this folder.

## Packages

- `libs/http-api-contract`: endpoint DSL, runtime dev app, contract and lambda generation.
- `libs/schema`: schema primitives and JSON Schema export.
- `libs/step-functions`: Step Functions definition and local execution helpers.
- `libs/sqs`: SQS clients, queue/listener abstractions, listener runtime wiring.
- `libs/dynamodb`: DynamoDB runtime adapters and typed table helpers.
- `libs/s3`: S3 runtime adapters and helper operations.

## Guardrails

- Follow strict TDD.
- File names must be kebab-case.
- At most one exported function per source file.
- At most 300 lines per source file.

## Documentation

Each library must keep `README.md` aligned with its public exports and behavior. Any library change should update:

- root `README.md`
- that library `README.md`
