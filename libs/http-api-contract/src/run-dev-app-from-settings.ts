/**
 * @fileoverview Implements run dev app from settings.
 */
import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createNoopLogger } from "@babbstack/logger";
import type { Logger } from "@babbstack/logger";
import {
  createRuntimeSqs,
  listDefinedSqsListeners,
  resetDefinedSqsListeners,
} from "@babbstack/sqs";
import { createDevApp } from "./create-dev-app";
import { loadEndpointsFromModule } from "./load-endpoints-from-module";
import { parseJsonc } from "./parse-jsonc";
import { resolvePathFromSettings } from "./resolve-path-from-settings";
import { startSqsListenerPolling } from "./start-sqs-listener-polling";

type DevServeInput = {
  fetch: (request: Request) => Promise<Response>;
  port: number;
};

type RunDevAppFromSettingsOptions = {
  env?: Record<string, string | undefined>;
  listenerPollMs?: number;
  logger?: Logger;
  log?: (message: string) => void;
  serve?: (input: DevServeInput) => unknown;
};

/** Converts to string setting. */
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

/** Converts to port. */
function toPort(value: string | undefined): number {
  const source = (value ?? "3000").trim();
  const parsed = Number(source);

  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Invalid PORT: ${source}`);
  }

  return parsed;
}

/** Converts to endpoint settings. */
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

/** Converts to listener poll ms. */
function toListenerPollMs(value: number | undefined): number {
  const resolved = value ?? 250;
  if (!Number.isInteger(resolved) || resolved <= 0) {
    throw new Error(`listenerPollMs must be a positive integer: ${String(value)}`);
  }

  return resolved;
}

/** Converts to logger. */
function toLogger(options: RunDevAppFromSettingsOptions): Logger {
  if (options.logger) {
    return options.logger;
  }

  if (options.log) {
    return {
      debug(message) {
        options.log?.(message);
      },
      error(message) {
        options.log?.(message);
      },
      getPersistentKeys() {
        return {};
      },
      info(message) {
        options.log?.(message);
      },
      warn(message) {
        options.log?.(message);
      },
    };
  }

  return createNoopLogger();
}

/**
 * Runs dev app from settings.
 * @param settingsFilePath - Settings file path parameter.
 * @param options - Options parameter.
 * @example
 * await runDevAppFromSettings(settingsFilePath, options)
 * @returns Output value.
 * @throws Error when operation fails.
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
  const logger = toLogger(options);

  const sqs = createRuntimeSqs();
  const fetch = createDevApp(endpoints, {
    logger,
    sqs,
  });
  const port = toPort((options.env ?? process.env).PORT);
  const serve = options.serve ?? ((input: DevServeInput) => Bun.serve(input));

  serve({
    fetch,
    port,
  });
  startSqsListenerPolling(sqsListeners, sqs, listenerPollMs, logger);
  logger.info(`babbstack dev server listening on http://localhost:${port}`);

  return port;
}
