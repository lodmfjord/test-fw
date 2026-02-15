/**
 * @fileoverview Implements tail segment for lambda zod validation compiler source.
 */

const ZOD_VALIDATION_COMPILER_SOURCE_TAIL = `
/** Converts values to node zod schema. */
function toNodeZodSchema(schema, rootSchema, nodeCache) {
  if (!isSchemaObject(schema)) {
    return simpleApiZod.unknown();
  }

  const cached = nodeCache.get(schema);
  if (cached) {
    return cached;
  }

  let builtValidator = simpleApiZod.unknown();
  const lazyValidator = simpleApiZod.lazy(() => builtValidator);
  nodeCache.set(schema, lazyValidator);
  assertSupportedSchemaKeywords(schema);

  let validator;
  if (typeof schema.$ref === "string") {
    validator = toNodeZodSchema(resolveRef(rootSchema, schema.$ref), rootSchema, nodeCache);
  } else if (schema.const !== undefined) {
    validator = simpleApiZod.literal(schema.const);
  } else if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    validator = toEnumZodSchema(schema.enum);
  } else if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    validator = toOneOfZodSchema(schema.oneOf, rootSchema, nodeCache);
  } else if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    validator = toAnyOfZodSchema(schema.anyOf, rootSchema, nodeCache);
  } else if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    const [first, ...rest] = schema.allOf;
    validator = toNodeZodSchema(first, rootSchema, nodeCache);
    for (const item of rest) {
      validator = validator.and(toNodeZodSchema(item, rootSchema, nodeCache));
    }
  } else {
    validator = toTypedZodSchema(schema, rootSchema, nodeCache);
  }

  builtValidator = withCommonModifiers(validator, schema);
  nodeCache.set(schema, builtValidator);
  return builtValidator;
}

/** Converts values to root zod schema. */
function toRootZodSchema(schema) {
  if (!isSchemaObject(schema)) {
    return simpleApiZod.unknown();
  }
  const cached = rootValidatorCache.get(schema);
  if (cached) {
    return cached;
  }
  const validator = toNodeZodSchema(schema, schema, new WeakMap());
  rootValidatorCache.set(schema, validator);
  return validator;
}

/** Handles parse by schema. */
function parseBySchema(schema, value, path) {
  if (!isSchemaObject(schema)) {
    return value;
  }

  let validator;
  try {
    validator = toRootZodSchema(schema);
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid schema";
    fail(path, message);
  }

  const validation = validator.safeParse(value);
  if (validation.success) {
    return validation.data;
  }

  const issue = validation.error.issues[0];
  if (!issue) {
    fail(path, "invalid value");
  }

  fail(toPath(path, toIssuePath(issue.path)), toIssueMessage(issue));
}
`;

export { ZOD_VALIDATION_COMPILER_SOURCE_TAIL };
