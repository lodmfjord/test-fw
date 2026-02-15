/** @fileoverview Tests execute sqs listener js. @module libs/http-api-contract/src/execute-sqs-listener-js.test */
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { beforeEach, describe, expect, it } from "bun:test";
import { listDefinedSqsListeners, resetDefinedSqsListeners } from "@babbstack/sqs";
import { resetDefinedEndpoints } from "./reset-defined-endpoints";
import { writeSqsListenerJsFiles } from "./write-sqs-listener-js-files";

type SqsEvent = {
  Records?: Array<{
    body?: string;
  }>;
};

type SqsResponse = {
  batchItemFailures: unknown[];
};

/** Gets handler from source. */
function getHandlerFromSource(source: string): (event: SqsEvent) => Promise<SqsResponse> {
  const sourceWithoutZodImport = source.replace(
    /import\s+\{\s*z\s+as\s+simpleApiZod\s*\}\s+from\s+["']zod["'];?\s*/g,
    'const { z: simpleApiZod } = require("zod");\n',
  );
  if (/^\s*import\s/m.test(sourceWithoutZodImport)) {
    throw new Error("Imports are forbidden in enclosed lambda runtime");
  }

  const transformedSource = sourceWithoutZodImport
    .replace(/export\s+async\s+function\s+handler\s*\(/, "async function handler(")
    .replace(/export\s*\{\s*handler\s*\};?/g, "");
  const runtimeRequire = createRequire(import.meta.url);

  const factory = new Function("require", `${transformedSource}\nreturn handler;`) as (
    runtimeRequire: (moduleName: string) => unknown,
  ) => (event: SqsEvent) => Promise<SqsResponse>;

  return factory(runtimeRequire);
}

describe("generated sqs listener lambda execution", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
    resetDefinedSqsListeners();
  });

  it("executes listener lambda source from module-registered listeners", async () => {
    const endpointModuleDirectory = await mkdtemp(join(tmpdir(), "babbstack-exec-listener-"));
    const endpointModulePath = join(endpointModuleDirectory, "endpoints.ts");
    const sqsImportPath = fileURLToPath(new URL("../../sqs/src/index.ts", import.meta.url));

    await writeFile(
      endpointModulePath,
      `
import { createSqsQueue } from "${sqsImportPath}";

const ble = createSqsQueue(
  {
    parse(input) {
      const source = input;
      if (!source || typeof source !== "object" || typeof source.userId !== "string") {
        throw new Error("invalid message");
      }

      return { userId: source.userId };
    },
  },
  {
    queueName: "ble-events",
  },
);

ble.addListener({
  listenerId: "ble_listener",
  handler: ({ message }) => {
    globalThis.__bleSeen = message.userId;
  },
});

export const endpoints = [];
`,
      "utf8",
    );

    await import(pathToFileURL(endpointModulePath).href);
    const outputDirectory = await mkdtemp(join(tmpdir(), "babbstack-listener-js-"));
    const listeners = listDefinedSqsListeners();
    await writeSqsListenerJsFiles(outputDirectory, listeners, {
      endpointModulePath,
    });
    const source = await readFile(join(outputDirectory, "ble_listener.mjs"), "utf8");

    const handler = getHandlerFromSource(source);
    const response = await handler({
      Records: [
        {
          body: JSON.stringify({
            userId: "user-1",
          }),
        },
      ],
    });

    expect(response.batchItemFailures).toEqual([]);
    expect((globalThis as { __bleSeen?: string }).__bleSeen).toBe("user-1");
  });
});
