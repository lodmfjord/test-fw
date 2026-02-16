/**
 * @fileoverview Implements render lambda env bootstrap source.
 */
import { toSecretDefinition } from "./to-secret-definition";
import type { EndpointRuntimeDefinition } from "./types";

type SecretVariableDefinition = {
  envName: string;
  localEnvName?: string;
  parameterName: string;
};

/** Converts to env config. */
function toEnvConfig(endpoint: EndpointRuntimeDefinition): {
  plain: Record<string, string>;
  secret: SecretVariableDefinition[];
} {
  const plain: Record<string, string> = {};
  const secret: SecretVariableDefinition[] = [];

  for (const [envName, value] of Object.entries(endpoint.env ?? {})) {
    const secretDefinition = toSecretDefinition(value);
    if (secretDefinition) {
      secret.push({
        envName,
        ...(secretDefinition.localEnvName ? { localEnvName: secretDefinition.localEnvName } : {}),
        parameterName: secretDefinition.parameterName,
      });
      continue;
    }

    plain[envName] = value;
  }

  return { plain, secret };
}

/**
 * Runs render lambda env bootstrap source.
 * @param endpoint - Endpoint parameter.
 * @example
 * renderLambdaEnvBootstrapSource(endpoint)
 * @returns Output value.
 */
export function renderLambdaEnvBootstrapSource(endpoint: EndpointRuntimeDefinition): string {
  const envConfig = toEnvConfig(endpoint);

  return `const endpointEnv = ${JSON.stringify(envConfig.plain)};
const endpointSecretEnv = ${JSON.stringify(envConfig.secret)};
let endpointEnvReadyPromise;

/** Returns whether an import error was caused by a missing module. */
function isModuleNotFoundImportError(error, moduleName) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = typeof error.code === "string" ? error.code : "";
  if (code !== "ERR_MODULE_NOT_FOUND" && code !== "MODULE_NOT_FOUND") {
    return false;
  }

  const message = typeof error.message === "string" ? error.message : "";
  return message.includes(moduleName);
}

/** Returns stable detail text for unknown thrown values. */
function toErrorDetail(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/** Handles load ssm parameter. */
async function loadSsmParameter(parameterName) {
  const v3ModuleName = "@aws-sdk/client-ssm";
  let v3ImportError;
  try {
    const ssmModule = await import(v3ModuleName);
    const client = new ssmModule.SSMClient({});
    const command = new ssmModule.GetParameterCommand({
      Name: parameterName,
      WithDecryption: true
    });
    const result = await client.send(command);
    const value = result?.Parameter?.Value;
    if (typeof value !== "string") {
      throw new Error("Missing parameter value for " + parameterName);
    }
    return value;
  } catch (error) {
    if (!isModuleNotFoundImportError(error, v3ModuleName)) {
      throw error;
    }
    v3ImportError = error;
  }

  const legacyModuleName = "aws-sdk";
  const legacyImportName = legacyModuleName;
  let legacyImportError;
  try {
    const legacyModule = await import(legacyImportName);
    const AwsSdk = legacyModule.default ?? legacyModule;
    const ssm = new AwsSdk.SSM();
    const result = await ssm
      .getParameter({
        Name: parameterName,
        WithDecryption: true
      })
      .promise();
    const value = result?.Parameter?.Value;
    if (typeof value !== "string") {
      throw new Error("Missing parameter value for " + parameterName);
    }
    return value;
  } catch (error) {
    if (!isModuleNotFoundImportError(error, legacyModuleName)) {
      throw error;
    }
    legacyImportError = error;
  }

  throw new Error(
    "Missing AWS SDK for SSM secret loading: " +
      toErrorDetail(v3ImportError) +
      "; " +
      toErrorDetail(legacyImportError)
  );
}

/** Handles initialize endpoint env. */
async function initializeEndpointEnv() {
  if (typeof process === "undefined" || !process.env) {
    return;
  }

  for (const [name, value] of Object.entries(endpointEnv)) {
    process.env[name] = value;
  }

  if (endpointSecretEnv.length === 0) {
    return;
  }

  const isLambdaRuntime = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (!isLambdaRuntime) {
    for (const entry of endpointSecretEnv) {
      const localEnvName = typeof entry.localEnvName === "string" ? entry.localEnvName : entry.envName;
      const localValue = process.env[localEnvName];
      if (typeof localValue === "string") {
        process.env[entry.envName] = localValue;
        continue;
      }

      simpleApiLogger.info("[simple-api] Would load parameter for env", {
        envName: entry.envName,
        parameterName: entry.parameterName
      });
    }
    return;
  }

  for (const entry of endpointSecretEnv) {
    process.env[entry.envName] = await loadSsmParameter(entry.parameterName);
  }
}

/** Handles ensure endpoint env loaded. */
async function ensureEndpointEnvLoaded() {
  if (!endpointEnvReadyPromise) {
    endpointEnvReadyPromise = initializeEndpointEnv();
  }

  return endpointEnvReadyPromise;
}
`;
}
