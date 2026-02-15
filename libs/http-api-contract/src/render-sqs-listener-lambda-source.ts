import type { SqsListenerRuntimeDefinition } from "@babbstack/sqs";

export function renderSqsListenerLambdaSource(
  listener: SqsListenerRuntimeDefinition,
  endpointModulePath: string,
  runtimeSqsImportSpecifier: string,
): string {
  return `import { listDefinedSqsListeners } from ${JSON.stringify(runtimeSqsImportSpecifier)};

let listenerPromise;

async function loadListener() {
  if (!listenerPromise) {
    listenerPromise = (async () => {
      const existingListener = listDefinedSqsListeners().find((item) => {
        return item.listenerId === "${listener.listenerId}";
      });
      if (existingListener) {
        return existingListener;
      }

      await import("${endpointModulePath}");

      const loadedListener = listDefinedSqsListeners().find((item) => {
        return item.listenerId === "${listener.listenerId}";
      });
      if (!loadedListener) {
        throw new Error("SQS listener not found for ${listener.listenerId}");
      }

      return loadedListener;
    })();
  }

  return listenerPromise;
}

function toRecords(event) {
  return Array.isArray(event?.Records) ? event.Records : [];
}

function parseRecordBody(record) {
  const rawBody = typeof record?.body === "string" ? record.body : "";
  if (rawBody.trim().length === 0) {
    return undefined;
  }

  return JSON.parse(rawBody);
}

export async function handler(event) {
  const listener = await loadListener();
  const records = toRecords(event);

  for (const record of records) {
    const parsedBody = parseRecordBody(record);
    const message = listener.parse(parsedBody);
    await listener.handler({
      message,
      request: {
        rawEvent: event,
        rawRecord: record
      }
    });
  }

  return {
    batchItemFailures: []
  };
}
`;
}
