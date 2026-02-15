/**
 * @fileoverview Implements head segment for lambda zod validation compiler source.
 */

const ZOD_VALIDATION_COMPILER_SOURCE_HEAD = `
/** Converts values to string zod schema. */
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

/** Converts values to number zod schema. */
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

/** Converts values to enum zod schema. */
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

/** Converts values to any of zod schema. */
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

/** Converts values to one of zod schema. */
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

/** Converts values to array zod schema. */
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

/** Converts values to object zod schema. */
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

/** Converts values to typed zod schema. */
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
`;

export { ZOD_VALIDATION_COMPILER_SOURCE_HEAD };
