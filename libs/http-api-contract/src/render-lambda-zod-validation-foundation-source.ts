const ZOD_VALIDATION_FOUNDATION_SOURCE = `
const rootValidatorCache = new WeakMap();
const SUPPORTED_SCHEMA_KEYS = new Set([
  "$defs",
  "$ref",
  "$schema",
  "additionalProperties",
  "allOf",
  "anyOf",
  "const",
  "default",
  "deprecated",
  "description",
  "enum",
  "examples",
  "exclusiveMaximum",
  "exclusiveMinimum",
  "format",
  "items",
  "maxItems",
  "maxLength",
  "maximum",
  "minItems",
  "minLength",
  "minimum",
  "multipleOf",
  "nullable",
  "oneOf",
  "pattern",
  "properties",
  "readOnly",
  "required",
  "title",
  "type",
  "writeOnly"
]);

function isSchemaObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toPath(parentPath, key) {
  if (!key || key.length === 0) {
    return parentPath;
  }

  if (!parentPath || parentPath.length === 0) {
    return key;
  }

  return parentPath + "." + key;
}

function toIssuePath(path) {
  if (!Array.isArray(path) || path.length === 0) {
    return undefined;
  }

  return path.map((segment) => String(segment)).join(".");
}

function toIssueMessage(issue) {
  if (issue?.code === "invalid_type") {
    return "expected " + String(issue.expected);
  }

  return issue?.message ?? "invalid value";
}

function fail(path, message) {
  const scope = path && path.length > 0 ? path : "value";
  throw new Error(scope + ": " + message);
}

function decodeJsonPointerToken(token) {
  return token.replace(/~1/g, "/").replace(/~0/g, "~");
}

function assertSupportedSchemaKeywords(schema) {
  for (const key of Object.keys(schema)) {
    if (SUPPORTED_SCHEMA_KEYS.has(key) || key.startsWith("x-")) {
      continue;
    }

    throw new Error("Unsupported schema keyword: " + key);
  }
}

function resolveRef(rootSchema, ref) {
  if (ref === "#") {
    return rootSchema;
  }

  if (!ref.startsWith("#/")) {
    throw new Error("Unsupported schema $ref: " + ref);
  }

  const segments = ref
    .slice(2)
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => decodeJsonPointerToken(segment));
  let current = rootSchema;
  for (const segment of segments) {
    if (current === null || (typeof current !== "object" && !Array.isArray(current))) {
      throw new Error("Invalid schema $ref target: " + ref);
    }

    current = current[segment];
    if (current === undefined) {
      throw new Error("Invalid schema $ref target: " + ref);
    }
  }

  if (!isSchemaObject(current)) {
    throw new Error("Invalid schema $ref target: " + ref);
  }

  return current;
}

function withCommonModifiers(validator, schema) {
  let next = validator;

  if (schema.default !== undefined) {
    next = next.default(schema.default);
  }

  const typeIncludesNull = Array.isArray(schema.type) && schema.type.includes("null");
  if (schema.nullable === true && !typeIncludesNull) {
    next = next.nullable();
  }

  return next;
}
`;

export function toZodValidationFoundationSource(): string {
  return ZOD_VALIDATION_FOUNDATION_SOURCE;
}
