import type { SqsListenerRuntimeDefinition } from "./types";

const SQS_LISTENER_REGISTRY_KEY = Symbol.for("babbstack.sqs-listener-registry");

type RegistryGlobal = typeof globalThis & {
  [SQS_LISTENER_REGISTRY_KEY]?: SqsListenerRuntimeDefinition[];
};

const registryGlobal = globalThis as RegistryGlobal;

if (!registryGlobal[SQS_LISTENER_REGISTRY_KEY]) {
  registryGlobal[SQS_LISTENER_REGISTRY_KEY] = [];
}

export const sqsListenerRegistry = registryGlobal[
  SQS_LISTENER_REGISTRY_KEY
] as SqsListenerRuntimeDefinition[];
