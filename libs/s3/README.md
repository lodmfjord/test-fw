# `@babbstack/s3`

S3 adapters for babbstack runtimes.

- `createMemoryS3()`: local adapter backed by a tmp directory (logs local folder path).
- `createAwsS3()`: AWS S3-backed adapter.
- `createRuntimeS3()`: selects AWS in Lambda runtime, local tmp-backed adapter otherwise.

## Basic example

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
