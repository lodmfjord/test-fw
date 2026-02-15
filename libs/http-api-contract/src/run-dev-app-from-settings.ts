/**
 * @fileoverview Implements run dev app from settings.
 */
import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  createRuntimeSqs,
  listDefinedSqsListeners,
  resetDefinedSqsListeners,
  runSqsQueueListener,
} from "@babbstack/sqs";
import type {
  SqsClient,
  SqsListenerRuntimeDefinition,
  SqsMessage,
  SqsQueueListener,
} from "@babbstack/sqs";
import { createDevApp } from "./create-dev-app";
import { loadEndpointsFromModule } from "./load-endpoints-from-module";
import { parseJsonc } from "./parse-jsonc";
import { resolvePathFromSettings } from "./resolve-path-from-settings";

type DevServeInput = {
  fetch: (request: Request) => Promise<Response>;
  port: number;
};

type RunDevAppFromSettingsOptions = {
  env?: Record<string, string | undefined>;
  listenerPollMs?: number;
  log?: (message: string) => void;
  serve?: (input: DevServeInput) => unknown;
};

/** Converts values to string setting. */
function toStringSetting(
  value: unknown,
  settingName: string,
  options: { defaultValue?: string; required: boolean },
): string {
  if (value === undefined || value === null) {
    if (options.required) {
      throw new Error(`Missing required setting: ${settingName}`);
    }

    return options.defaultValue ?? "";
  }

  if (typeof value !== "string") {
    throw new Error(`Setting "${settingName}" must be a string`);
  }

  const source = value.trim();
  if (source.length === 0) {
    if (options.required) {
      throw new Error(`Setting "${settingName}" must not be empty`);
    }

    return options.defaultValue ?? "";
  }

  return source;
}

/** Converts values to port. */
function toPort(value: string | undefined): number {
  const source = (value ?? "3000").trim();
  const parsed = Number(source);

  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Invalid PORT: ${source}`);
  }

  return parsed;
}

/** Converts values to endpoint settings. */
function toEndpointSettings(value: unknown): {
  endpointExportName: string;
  endpointModulePath: string;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Settings JSON must be an object");
  }

  const source = value as Record<string, unknown>;
  return {
    endpointExportName: toStringSetting(source.endpointExportName, "endpointExportName", {
      defaultValue: "endpoints",
      required: false,
    }),
    endpointModulePath: toStringSetting(source.endpointModulePath, "endpointModulePath", {
      required: true,
    }),
  };
}

/** Converts values to listener poll ms. */
function toListenerPollMs(value: number | undefined): number {
  const resolved = value ?? 250;
  if (!Number.isInteger(resolved) || resolved <= 0) {
    throw new Error(`listenerPollMs must be a positive integer: ${String(value)}`);
  }

  return resolved;
}

/** Handles start sqs listeners. */
function startSqsListeners(
  listeners: ReadonlyArray<SqsListenerRuntimeDefinition>,
  sqs: SqsClient,
  pollMs: number,
  log: (message: string) => void,
): void {
  if (listeners.length === 0) {
    return;
  }

  let isPolling = false;
  /** Handles poll. */ const poll = async (): Promise<void> => {
    if (isPolling) {
      return;
    }

    isPolling = true;
    try {
      for (const listener of listeners) {
        const typedListener = listener as unknown as SqsQueueListener<SqsMessage>;
        const processed = await runSqsQueueListener(typedListener, sqs);
        if (processed > 0) {
          log(`babbstack sqs listener ${listener.listenerId} processed ${processed} message(s)`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown SQS listener error";
      log(`babbstack sqs listener polling error: ${message}`);
    } finally {
      isPolling = false;
    }
  };

  const timer = setInterval(() => {
    void poll();
  }, pollMs);
  timer.unref?.();
  void poll();
  log(`babbstack sqs listener polling started for ${listeners.length} listener(s) at ${pollMs}ms`);
}

/**
 * Runs dev app from settings.
 * @param settingsFilePath - Settings file path parameter.
 * @param options - Options parameter.
 * @example
 * await runDevAppFromSettings(settingsFilePath, options)
 */
export async function runDevAppFromSettings(
  settingsFilePath: string,
  options: RunDevAppFromSettingsOptions = {},
): Promise<number> {
  const source = settingsFilePath.trim();
  if (source.length === 0) {
    throw new Error("settingsFilePath is required");
  }

  const absoluteSettingsPath = resolvePathFromSettings(source, process.cwd());
  const settingsDirectory = dirname(absoluteSettingsPath);
  const settingsSource = await readFile(absoluteSettingsPath, "utf8");

  let parsedSettings: unknown;
  try {
    parsedSettings = parseJsonc(settingsSource);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parse error";
    throw new Error(`Invalid JSON in settings file "${absoluteSettingsPath}": ${message}`);
  }

  const settings = toEndpointSettings(parsedSettings);
  const endpointModulePath = resolvePathFromSettings(
    settings.endpointModulePath,
    settingsDirectory,
  );
  const listenerPollMs = toListenerPollMs(options.listenerPollMs);
  resetDefinedSqsListeners();
  const endpoints = await loadEndpointsFromModule(endpointModulePath, settings.endpointExportName);
  const sqsListeners = listDefinedSqsListeners();

  const sqs = createRuntimeSqs();
  const fetch = createDevApp(endpoints, {
    sqs,
  });
  const port = toPort((options.env ?? process.env).PORT);
  const serve = options.serve ?? ((input: DevServeInput) => Bun.serve(input));
  const log = options.log ?? console.log;

  serve({
    fetch,
    port,
  });
  startSqsListeners(sqsListeners, sqs, listenerPollMs, log);
  log(`babbstack dev server listening on http://localhost:${port}`);

  return port;
}
