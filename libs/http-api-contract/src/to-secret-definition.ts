const SECRET_PREFIX = "simple-api:ssm:";
const LOCAL_ENV_MARKER = "|local-env:";

export function toSecretDefinition(
  value: string,
): { localEnvName?: string; parameterName: string } | undefined {
  if (!value.startsWith(SECRET_PREFIX)) {
    return undefined;
  }

  const source = value.slice(SECRET_PREFIX.length);
  const markerIndex = source.indexOf(LOCAL_ENV_MARKER);
  if (markerIndex === -1) {
    const parameterName = source.trim();
    return parameterName.length > 0 ? { parameterName } : undefined;
  }

  const parameterName = source.slice(0, markerIndex).trim();
  if (parameterName.length === 0) {
    return undefined;
  }

  const localEnvName = source.slice(markerIndex + LOCAL_ENV_MARKER.length).trim();
  return localEnvName.length > 0 ? { localEnvName, parameterName } : { parameterName };
}
