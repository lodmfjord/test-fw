import { describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMemoryS3 } from "./create-memory-s3";

describe("createMemoryS3", () => {
  it("puts, gets, lists, and removes objects while preserving contentType", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "simple-api-s3-test-"));

    try {
      const s3 = createMemoryS3({
        baseUrl: "http://local-s3.test",
        logger() {},
        rootDir,
      });

      await s3.put({
        body: "hello s3",
        bucketName: "uploads",
        contentType: "text/plain",
        key: "files/hello.txt",
      });

      await s3.put({
        body: "avatar",
        bucketName: "uploads",
        contentType: "image/png",
        key: "images/avatar.png",
      });

      const object = await s3.get({
        bucketName: "uploads",
        key: "files/hello.txt",
      });

      expect(object).toBeDefined();
      expect(object?.bucketName).toBe("uploads");
      expect(object?.key).toBe("files/hello.txt");
      expect(object?.contentType).toBe("text/plain");
      expect(new TextDecoder().decode(object?.body)).toBe("hello s3");

      const listed = await s3.list({
        bucketName: "uploads",
        prefix: "files/",
      });

      expect(listed).toEqual([
        {
          bucketName: "uploads",
          contentType: "text/plain",
          key: "files/hello.txt",
          size: 8,
        },
      ]);

      await s3.remove({
        bucketName: "uploads",
        key: "files/hello.txt",
      });

      const missing = await s3.get({
        bucketName: "uploads",
        key: "files/hello.txt",
      });
      expect(missing).toBeUndefined();
    } finally {
      await rm(rootDir, { force: true, recursive: true });
    }
  });

  it("creates local fake secure links", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "simple-api-s3-test-"));

    try {
      const s3 = createMemoryS3({
        baseUrl: "http://local-s3.test",
        logger() {},
        rootDir,
      });

      const secureLink = await s3.createSecureLink({
        bucketName: "uploads",
        contentType: "image/png",
        expiresInSeconds: 120,
        key: "images/avatar.png",
        operation: "put",
      });

      expect(secureLink.startsWith("http://local-s3.test/")).toBe(true);
      expect(secureLink.includes("bucket=uploads")).toBe(true);
      expect(secureLink.includes("key=images%2Favatar.png")).toBe(true);
      expect(secureLink.includes("operation=put")).toBe(true);
      expect(secureLink.includes("contentType=image%2Fpng")).toBe(true);
      expect(secureLink.includes("token=")).toBe(true);
      expect(secureLink.includes("expiresAt=")).toBe(true);
    } finally {
      await rm(rootDir, { force: true, recursive: true });
    }
  });
});
