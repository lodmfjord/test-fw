/**
 * @fileoverview Implements create secret.
 */
const SECRET_PREFIX = "simple-api:ssm:";
const LOCAL_ENV_MARKER = "|local-env:";

type CreateSecretOptions = {
  localEnvName?: string;
};

/**
 * Creates secret.
 * @param parameterName - Parameter name parameter.
 * @param options - Options parameter.
 * @example
 * createSecret(parameterName, options)
 * @returns Output value.
 * @throws Error when operation fails.
 */
export function createSecret(parameterName: string, options: CreateSecretOptions = {}): string {
  const source = parameterName.trim();
  if (source.length === 0) {
    throw new Error("createSecret parameterName is required");
  }

  const localEnvName = options.localEnvName?.trim();
  if (options.localEnvName !== undefined && !localEnvName) {
    throw new Error("createSecret localEnvName is required when provided");
  }

  return `${SECRET_PREFIX}${source}${localEnvName ? `${LOCAL_ENV_MARKER}${localEnvName}` : ""}`;
}
