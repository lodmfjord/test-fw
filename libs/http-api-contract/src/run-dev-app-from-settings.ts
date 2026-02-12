import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
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
  log?: (message: string) => void;
  serve?: (input: DevServeInput) => unknown;
};

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

function toPort(value: string | undefined): number {
  const source = (value ?? "3000").trim();
  const parsed = Number(source);

  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Invalid PORT: ${source}`);
  }

  return parsed;
}

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
  const endpoints = await loadEndpointsFromModule(endpointModulePath, settings.endpointExportName);

  const fetch = createDevApp(endpoints);
  const port = toPort((options.env ?? process.env).PORT);
  const serve = options.serve ?? ((input: DevServeInput) => Bun.serve(input));
  const log = options.log ?? console.log;

  serve({
    fetch,
    port,
  });
  log(`babbstack dev server listening on http://localhost:${port}`);

  return port;
}
