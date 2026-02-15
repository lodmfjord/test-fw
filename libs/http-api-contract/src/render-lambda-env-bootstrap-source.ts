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

/** Converts values to env config. */
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
 * Handles render lambda env bootstrap source.
 * @param endpoint - Endpoint parameter.
 * @example
 * renderLambdaEnvBootstrapSource(endpoint)
 */
export function renderLambdaEnvBootstrapSource(endpoint: EndpointRuntimeDefinition): string {
  const envConfig = toEnvConfig(endpoint);

  return `const endpointEnv = ${JSON.stringify(envConfig.plain)};
const endpointSecretEnv = ${JSON.stringify(envConfig.secret)};
let endpointEnvReadyPromise;

/** Handles load ssm parameter. */
async function loadSsmParameter(parameterName) {
  const v3ModuleName = "@aws-sdk/client-ssm";
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
  } catch {}

  const legacyModuleName = "aws-sdk";
  const legacyImportName = legacyModuleName;
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
  } catch {}

  throw new Error("Missing AWS SDK for SSM secret loading");
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

      console.log("[simple-api] Would load parameter " + entry.parameterName + " into " + entry.envName);
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
