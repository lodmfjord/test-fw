export function toExternalModulesSetting(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error('Setting "externalModules" must be an array of strings');
  }

  const externalModules = value.map((item, index) => {
    if (typeof item !== "string") {
      throw new Error(`Setting "externalModules[${index}]" must be a string`);
    }

    const moduleName = item.trim();
    if (moduleName.length === 0) {
      throw new Error(`Setting "externalModules[${index}]" must not be empty`);
    }

    return moduleName;
  });

  return externalModules.length > 0 ? externalModules : undefined;
}
