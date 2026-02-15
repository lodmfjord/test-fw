# @babbstack/s3

S3 adapters for local and AWS runtimes.

## Exports

- clients: `createMemoryS3`, `createAwsS3`, `createRuntimeS3`
- types for put/get/list/remove/secure-link operations

## Runtime Selection

`createRuntimeS3()` selects AWS S3 in Lambda runtime and a local memory/tmp-backed adapter outside Lambda.

## Basic Example

```ts
import { createRuntimeS3 } from "@babbstack/s3";

const s3 = createRuntimeS3();

await s3.put({
  body: "hello",
  bucketName: "uploads",
  contentType: "text/plain",
  key: "files/hello.txt",
});

const file = await s3.get({
  bucketName: "uploads",
  key: "files/hello.txt",
});

const secureLink = await s3.createSecureLink({
  bucketName: "uploads",
  key: "files/hello.txt",
  operation: "get",
});
```

## Build

```bash
bun run --cwd libs/s3 build
```
