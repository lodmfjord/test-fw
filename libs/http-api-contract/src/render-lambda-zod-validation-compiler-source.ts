const ZOD_VALIDATION_COMPILER_SOURCE = `
function toStringZodSchema(schema) {
  let validator = simpleApiZod.string();
  if (typeof schema.minLength === "number") {
    validator = validator.min(schema.minLength);
  }
  if (typeof schema.maxLength === "number") {
    validator = validator.max(schema.maxLength);
  }
  if (typeof schema.pattern === "string") {
    try {
      validator = validator.regex(new RegExp(schema.pattern));
    } catch {}
  }
  if (schema.format === "email") {
    validator = validator.email();
  } else if (schema.format === "uuid") {
    validator = validator.uuid();
  } else if (schema.format === "url") {
    validator = validator.url();
  }
  return validator;
}

function toNumberZodSchema(schema, integer) {
  let validator = integer ? simpleApiZod.number().int() : simpleApiZod.number();
  if (typeof schema.minimum === "number") {
    validator = validator.gte(schema.minimum);
  }
  if (typeof schema.maximum === "number") {
    validator = validator.lte(schema.maximum);
  }
  if (typeof schema.exclusiveMinimum === "number") {
    validator = validator.gt(schema.exclusiveMinimum);
  }
  if (typeof schema.exclusiveMaximum === "number") {
    validator = validator.lt(schema.exclusiveMaximum);
  }
  if (typeof schema.multipleOf === "number" && schema.multipleOf !== 0) {
    validator = validator.multipleOf(schema.multipleOf);
  }
  return validator;
}

function toEnumZodSchema(values) {
  const literalSchemas = values.map((value) => simpleApiZod.literal(value));
  if (literalSchemas.length === 0) {
    return simpleApiZod.unknown();
  }
  if (literalSchemas.length === 1) {
    return literalSchemas[0];
  }
  return simpleApiZod.union(literalSchemas);
}

function toAnyOfZodSchema(options, rootSchema, nodeCache) {
  const validators = options.map((option) => toNodeZodSchema(option, rootSchema, nodeCache));
  if (validators.length === 0) {
    return simpleApiZod.unknown();
  }
  if (validators.length === 1) {
    return validators[0];
  }
  return simpleApiZod.union(validators);
}

function toOneOfZodSchema(options, rootSchema, nodeCache) {
  const validators = options.map((option) => toNodeZodSchema(option, rootSchema, nodeCache));
  if (validators.length === 0) {
    return simpleApiZod.unknown();
  }
  if (validators.length === 1) {
    return validators[0];
  }
  const union = simpleApiZod.union(validators);
  return union.superRefine((value, context) => {
    let matches = 0;
    for (const validator of validators) {
      if (validator.safeParse(value).success) {
        matches += 1;
        if (matches > 1) {
          break;
        }
      }
    }
    if (matches !== 1) {
      context.addIssue({
        code: "custom",
        message: "expected value matching exactly one schema",
      });
    }
  });
}

function toArrayZodSchema(schema, rootSchema, nodeCache) {
  const itemSchema = isSchemaObject(schema.items) ? schema.items : {};
  let validator = simpleApiZod.array(toNodeZodSchema(itemSchema, rootSchema, nodeCache));
  if (typeof schema.minItems === "number") {
    validator = validator.min(schema.minItems);
  }
  if (typeof schema.maxItems === "number") {
    validator = validator.max(schema.maxItems);
  }
  return validator;
}

function toObjectZodSchema(schema, rootSchema, nodeCache) {
  const properties = isSchemaObject(schema.properties) ? schema.properties : {};
  const requiredSet = new Set(
    Array.isArray(schema.required)
      ? schema.required.filter((item) => typeof item === "string")
      : [],
  );
  const shape = {};
  for (const [name, value] of Object.entries(properties)) {
    const propertyValidator = toNodeZodSchema(value, rootSchema, nodeCache);
    shape[name] = requiredSet.has(name) ? propertyValidator : propertyValidator.optional();
  }

  let validator = simpleApiZod.object(shape);
  if (schema.additionalProperties === true) {
    validator = validator.passthrough();
  } else if (isSchemaObject(schema.additionalProperties)) {
    validator = validator.catchall(
      toNodeZodSchema(schema.additionalProperties, rootSchema, nodeCache),
    );
  } else {
    validator = validator.strip();
  }
  return validator;
}

function toTypedZodSchema(schema, rootSchema, nodeCache) {
  const schemaType = schema.type;

  if (Array.isArray(schemaType)) {
    const normalizedTypes = schemaType.filter((item) => typeof item === "string");
    const allowsNull = normalizedTypes.includes("null") || schema.nullable === true;
    const nonNullTypes = normalizedTypes.filter((item) => item !== "null");
    if (nonNullTypes.length === 0) {
      return simpleApiZod.null();
    }
    const validators = nonNullTypes.map((typeName) =>
      toTypedZodSchema({ ...schema, nullable: false, type: typeName }, rootSchema, nodeCache),
    );
    const baseValidator = validators.length === 1 ? validators[0] : simpleApiZod.union(validators);
    return allowsNull ? baseValidator.nullable() : baseValidator;
  }

  if (schemaType === "string") {
    return toStringZodSchema(schema);
  }
  if (schemaType === "number") {
    return toNumberZodSchema(schema, false);
  }
  if (schemaType === "integer") {
    return toNumberZodSchema(schema, true);
  }
  if (schemaType === "boolean") {
    return simpleApiZod.boolean();
  }
  if (schemaType === "null") {
    return simpleApiZod.null();
  }
  if (schemaType === "array") {
    return toArrayZodSchema(schema, rootSchema, nodeCache);
  }
  if (schemaType === "object" || isSchemaObject(schema.properties)) {
    return toObjectZodSchema(schema, rootSchema, nodeCache);
  }
  return simpleApiZod.unknown();
}

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

export function toZodValidationCompilerSource(): string {
  return ZOD_VALIDATION_COMPILER_SOURCE;
}
