/** @fileoverview Implements create secret. @module libs/http-api-contract/src/create-secret */
const SECRET_PREFIX = "simple-api:ssm:";
const LOCAL_ENV_MARKER = "|local-env:";

type CreateSecretOptions = {
  localEnvName?: string;
};

/** Creates secret. @example `createSecret(input)` */
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
