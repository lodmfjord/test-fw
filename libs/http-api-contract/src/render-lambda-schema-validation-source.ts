const SCHEMA_VALIDATION_SUPPORT_SOURCE = `
function isPlainObjectValue(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toPath(path, key) {
  if (!key) {
    return path;
  }

  if (!path || path.length === 0) {
    return key;
  }

  return path + "." + key;
}

function toExpectedMessageFromSchema(schema) {
  if (!schema || typeof schema !== "object") {
    return "invalid value";
  }

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return "expected one of " + schema.enum.map((item) => JSON.stringify(item)).join(", ");
  }

  if (schema.const !== undefined) {
    return "expected " + JSON.stringify(schema.const);
  }

  if (typeof schema.type === "string") {
    return "expected " + schema.type;
  }

  if (Array.isArray(schema.type) && schema.type.length > 0) {
    return "expected " + schema.type.map((item) => String(item)).join(" or ");
  }

  return "invalid value";
}

function failValidation(path, message) {
  const scope = path && path.length > 0 ? path : "value";
  throw new Error(scope + ": " + message);
}

function parseBySchema(schema, value, path) {
  if (!schema || typeof schema !== "object") {
    return value;
  }

  if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    for (const option of schema.anyOf) {
      try {
        return parseBySchema(option, value, path);
      } catch {}
    }
    failValidation(path, toExpectedMessageFromSchema(schema));
  }

  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    let matchCount = 0;
    let matchedValue = value;
    for (const option of schema.oneOf) {
      try {
        matchedValue = parseBySchema(option, value, path);
        matchCount += 1;
      } catch {}
    }

    if (matchCount === 1) {
      return matchedValue;
    }

    failValidation(path, toExpectedMessageFromSchema(schema));
  }

  if (schema.const !== undefined && value !== schema.const) {
    failValidation(path, "expected " + JSON.stringify(schema.const));
  }

  if (
    Array.isArray(schema.enum) &&
    schema.enum.length > 0 &&
    !schema.enum.some((item) => item === value)
  ) {
    failValidation(path, toExpectedMessageFromSchema(schema));
  }

  if (Array.isArray(schema.type) && schema.type.length > 0) {
    for (const typeName of schema.type) {
      try {
        return parseBySchema(
          {
            ...schema,
            type: typeName,
          },
          value,
          path,
        );
      } catch {}
    }

    failValidation(path, toExpectedMessageFromSchema(schema));
  }

  const schemaType = typeof schema.type === "string" ? schema.type : undefined;

  if (schemaType === "string") {
    if (typeof value !== "string") {
      failValidation(path, "expected string");
    }

    return value;
  }

  if (schemaType === "number") {
    if (typeof value !== "number" || Number.isNaN(value)) {
      failValidation(path, "expected number");
    }

    return value;
  }

  if (schemaType === "integer") {
    if (!Number.isInteger(value)) {
      failValidation(path, "expected integer");
    }

    return value;
  }

  if (schemaType === "boolean") {
    if (typeof value !== "boolean") {
      failValidation(path, "expected boolean");
    }

    return value;
  }

  if (schemaType === "null") {
    if (value !== null) {
      failValidation(path, "expected null");
    }

    return value;
  }

  if (schemaType === "array") {
    if (!Array.isArray(value)) {
      failValidation(path, "expected array");
    }

    return value.map((item, index) =>
      parseBySchema(schema.items, item, toPath(path, String(index))),
    );
  }

  if (schemaType === "object" || isPlainObjectValue(schema.properties)) {
    if (!isPlainObjectValue(value)) {
      failValidation(path, "expected object");
    }

    const sourceObject = value;
    const properties = isPlainObjectValue(schema.properties) ? schema.properties : {};
    const required = Array.isArray(schema.required)
      ? schema.required.filter((item) => typeof item === "string")
      : [];
    const requiredSet = new Set(required);
    const normalized = {};

    for (const [propertyName, propertySchema] of Object.entries(properties)) {
      const hasProperty = Object.prototype.hasOwnProperty.call(sourceObject, propertyName);

      if (!hasProperty) {
        if (requiredSet.has(propertyName)) {
          parseBySchema(propertySchema, undefined, toPath(path, propertyName));
        }
        continue;
      }

      normalized[propertyName] = parseBySchema(
        propertySchema,
        sourceObject[propertyName],
        toPath(path, propertyName),
      );
    }

    return normalized;
  }

  return value;
}
`;

export function toSchemaValidationSupportSource(): string {
  return SCHEMA_VALIDATION_SUPPORT_SOURCE;
}
