/**
 * @fileoverview Implements render lambda s3 context helper source.
 */

/**
 * Converts to s3 context helper source.
 * @example
 * toS3ContextHelperSource()
 * @returns Output value.
 */
export function toS3ContextHelperSource(): string {
  return `
/** Converts values to s3 for context. */
function toS3ForContext(client, config) {
  if (!config) {
    return undefined;
  }

  const bucketNamePrefix = typeof process === "undefined" || !process.env
    ? ""
    : process.env.SIMPLE_API_S3_BUCKET_NAME_PREFIX ?? "";
  const access = Array.isArray(config.access) ? config.access : [];
  const hasAccess = (value) => access.includes(value);
  const scopedClient = {
    async createSecureLink(input) {
      const operation = input.operation ?? "get";
      if (operation === "put" && !hasAccess("write")) throw new Error("S3 context does not allow write access");
      if (operation === "get" && !hasAccess("read")) throw new Error("S3 context does not allow read access");
      return client.createSecureLink(input);
    },
    async get(input) {
      if (!hasAccess("read")) throw new Error("S3 context does not allow read access");
      return client.get(input);
    },
    async list(input) {
      if (!hasAccess("list")) throw new Error("S3 context does not allow list access");
      return client.list(input);
    },
    async put(input) {
      if (!hasAccess("write")) throw new Error("S3 context does not allow write access");
      return client.put(input);
    },
    async remove(input) {
      if (!hasAccess("remove")) throw new Error("S3 context does not allow remove access");
      await client.remove(input);
    }
  };

  return createSimpleApiCreateBucket({
    createClient() {
      return scopedClient;
    },
    name: bucketNamePrefix + config.runtime.bucketName
  });
}
`;
}
