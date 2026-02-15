# @babbstack/s3

S3 adapters for local and AWS runtimes.

## Exports

- bucket + clients: `createBucket`, `createMemoryS3`, `createAwsS3`, `createRuntimeS3`
- types for put/get/list/remove/secure-link operations

## Runtime Selection

`createRuntimeS3()` selects AWS S3 in Lambda runtime and a local memory/tmp-backed adapter outside Lambda.

## Memory Logger Injection

`createMemoryS3()` accepts:

- `logger`: shared `Logger` from `@babbstack/logger` (preferred)
- `log`: legacy `(message: string) => void` callback (temporary compatibility)

When neither is provided, memory S3 uses a no-op logger.

## Bucket-First Example

```ts
import { createBucket } from "@babbstack/s3";

const uploads = createBucket({
  name: "uploads",
});

await uploads.put({
  body: "hello",
  contentType: "text/plain",
  key: "files/hello.txt",
});

const file = await uploads.get({
  key: "files/hello.txt",
});

const secureLink = await uploads.createSecureLink({
  key: "files/hello.txt",
  operation: "get",
});
```

`createBucket(...)` defaults to `createRuntimeS3()` internally and keeps `runtimeConfig` metadata (`kind: "s3-bucket"`, `bucketName`) for endpoint-context wiring in `@babbstack/http-api-contract`.

## Build

```bash
bun run --cwd libs/s3 build
```
