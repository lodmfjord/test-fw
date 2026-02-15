/** @fileoverview Implements create default aws s3 operations. @module libs/s3/src/create-default-aws-s3-operations */
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client as AwsS3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3AwsNormalizers } from "./s3-aws-normalizers";
import type {
  AwsS3Operations,
  S3CreateSecureLinkInput,
  S3GetInput,
  S3ListInput,
  S3Object,
  S3ObjectSummary,
  S3PutInput,
  S3RemoveInput,
} from "./types";

/** Creates default aws s3 operations. @example `await createDefaultAwsS3Operations(input)` */
export async function createDefaultAwsS3Operations(): Promise<AwsS3Operations> {
  const client = new AwsS3Client({});

  return {
    async createSecureLink(input: S3CreateSecureLinkInput): Promise<string> {
      const bucketName = s3AwsNormalizers.toBucketName(input.bucketName);
      const key = s3AwsNormalizers.toObjectKey(input.key);
      const operation = input.operation ?? "get";
      const expiresIn = s3AwsNormalizers.toExpiresInSeconds(input.expiresInSeconds);
      const contentType = input.contentType
        ? s3AwsNormalizers.toContentType(input.contentType)
        : undefined;

      if (operation === "put") {
        const command = new PutObjectCommand({
          Bucket: bucketName,
          ...(contentType ? { ContentType: contentType } : {}),
          Key: key,
        });
        return getSignedUrl(client, command, { expiresIn });
      }

      const command = new GetObjectCommand({
        Bucket: bucketName,
        ...(contentType ? { ResponseContentType: contentType } : {}),
        Key: key,
      });
      return getSignedUrl(client, command, { expiresIn });
    },
    async getObject(input: S3GetInput): Promise<S3Object | undefined> {
      const bucketName = s3AwsNormalizers.toBucketName(input.bucketName);
      const key = s3AwsNormalizers.toObjectKey(input.key);

      try {
        const result = await client.send(
          new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
          }),
        );
        const body = await s3AwsNormalizers.toBodyBytes(result.Body);

        return {
          body,
          bucketName,
          contentType: s3AwsNormalizers.toContentType(result.ContentType),
          key,
          size: Number(result.ContentLength ?? body.byteLength),
        };
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "name" in error &&
          (error as { name?: string }).name === "NoSuchKey"
        ) {
          return undefined;
        }

        throw error;
      }
    },
    async listObjects(input: S3ListInput): Promise<S3ObjectSummary[]> {
      const bucketName = s3AwsNormalizers.toBucketName(input.bucketName);
      const result = await client.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          ...(input.prefix ? { Prefix: input.prefix } : {}),
        }),
      );

      const objects = result.Contents ?? [];
      return objects
        .filter((entry) => typeof entry.Key === "string")
        .map((entry) =>
          s3AwsNormalizers.toSummary({
            bucketName,
            contentType: s3AwsNormalizers.DEFAULT_CONTENT_TYPE,
            key: String(entry.Key),
            size: Number(entry.Size ?? 0),
          }),
        )
        .sort((left, right) => left.key.localeCompare(right.key));
    },
    async putObject(input: S3PutInput): Promise<S3ObjectSummary> {
      const bucketName = s3AwsNormalizers.toBucketName(input.bucketName);
      const key = s3AwsNormalizers.toObjectKey(input.key);
      const contentType = s3AwsNormalizers.toContentType(input.contentType);
      const body = s3AwsNormalizers.toPutBody(input.body);

      await client.send(
        new PutObjectCommand({
          Body: body,
          Bucket: bucketName,
          ContentType: contentType,
          Key: key,
        }),
      );

      return s3AwsNormalizers.toSummary({
        bucketName,
        contentType,
        key,
        size: typeof body === "string" ? body.length : body.byteLength,
      });
    },
    async removeObject(input: S3RemoveInput): Promise<void> {
      await client.send(
        new DeleteObjectCommand({
          Bucket: s3AwsNormalizers.toBucketName(input.bucketName),
          Key: s3AwsNormalizers.toObjectKey(input.key),
        }),
      );
    },
  };
}
