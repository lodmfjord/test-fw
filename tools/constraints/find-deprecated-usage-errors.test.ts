/**
 * @fileoverview Tests deprecated usage constraint detection.
 */
import { describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findDeprecatedUsageErrors } from "./find-deprecated-usage-errors";

describe("findDeprecatedUsageErrors", () => {
  it("reports deprecated type usage", () => {
    const fixtureDirectory = mkdtempSync(join(tmpdir(), "deprecated-usage-"));

    try {
      writeFileSync(
        join(fixtureDirectory, "tsconfig.json"),
        JSON.stringify({
          compilerOptions: {
            module: "ESNext",
            moduleResolution: "Bundler",
            skipLibCheck: true,
            strict: true,
            target: "ESNext",
          },
          include: ["**/*.ts"],
        }),
      );
      writeFileSync(
        join(fixtureDirectory, "deprecated.ts"),
        "/** @deprecated use NewType */\nexport type OldType = string;\nexport type NewType = string;\n",
      );
      writeFileSync(
        join(fixtureDirectory, "consumer.ts"),
        'import type { OldType } from "./deprecated";\nconst value: OldType = "x";\nconsole.log(value);\n',
      );

      const errors = findDeprecatedUsageErrors(
        [join(fixtureDirectory, "consumer.ts")],
        join(fixtureDirectory, "tsconfig.json"),
      );

      expect(errors).toEqual([
        "consumer.ts:1:15: uses deprecated API/type (\"'OldType' is deprecated.\").",
      ]);
    } finally {
      rmSync(fixtureDirectory, {
        force: true,
        recursive: true,
      });
    }
  });

  it("does not report errors when no deprecated usage is found", () => {
    const fixtureDirectory = mkdtempSync(join(tmpdir(), "deprecated-usage-"));

    try {
      writeFileSync(
        join(fixtureDirectory, "tsconfig.json"),
        JSON.stringify({
          compilerOptions: {
            module: "ESNext",
            moduleResolution: "Bundler",
            skipLibCheck: true,
            strict: true,
            target: "ESNext",
          },
          include: ["**/*.ts"],
        }),
      );
      writeFileSync(join(fixtureDirectory, "types.ts"), "export type NewType = string;\n");
      writeFileSync(
        join(fixtureDirectory, "consumer.ts"),
        'import type { NewType } from "./types";\nconst value: NewType = "x";\nconsole.log(value);\n',
      );

      const errors = findDeprecatedUsageErrors(
        [join(fixtureDirectory, "consumer.ts")],
        join(fixtureDirectory, "tsconfig.json"),
      );

      expect(errors).toEqual([]);
    } finally {
      rmSync(fixtureDirectory, {
        force: true,
        recursive: true,
      });
    }
  });
});
