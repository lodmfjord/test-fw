export type JsonSchemaProperty = {
  default?: string;
  description?: string;
  type: "string";
};

export type EnvSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema";
  additionalProperties: false;
  properties: Record<string, JsonSchemaProperty>;
  required: string[];
  type: "object";
};
