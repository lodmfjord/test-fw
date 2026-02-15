/**
 * @fileoverview Tests standards #5 and #6 for documentation constraints.
 */
import { describe, expect, it } from "bun:test";
import { findDocumentationConstraintsErrors } from "./find-documentation-constraints-errors";

/** Builds a source block with a valid file-level JSDoc header. */
function toFileSource(functionSource: string): string {
  return `
    /**
     * @fileoverview File.
     */
    ${functionSource}
  `;
}

describe("findDocumentationConstraintsErrors standards #5 and #6", () => {
  it("requires @returns for exported functions without explicit return annotation", () => {
    const source = toFileSource(`
      /**
       * Runs operation.
       * @param input - Input value.
       * @example
       * run(input)
       */
      export function run(input: string) {
        return input.length;
      }
    `);
    const errors = findDocumentationConstraintsErrors("file.ts", source);

    expect(errors).toContain('file.ts: exported function "run" JSDoc must include @returns.');
  });

  it("requires @returns for exported functions with explicit non-void return annotations", () => {
    const source = toFileSource(`
      /**
       * Runs operation.
       * @param input - Input value.
       * @example
       * run(input)
       */
      export function run(input: string): number {
        return input.length;
      }
    `);
    const errors = findDocumentationConstraintsErrors("file.ts", source);

    expect(errors).toContain('file.ts: exported function "run" JSDoc must include @returns.');
  });

  it("allows missing @returns for exported functions explicitly typed as void", () => {
    const source = toFileSource(`
      /**
       * Runs operation.
       * @param input - Input value.
       * @example
       * run(input)
       */
      export function run(input: string): void {
        void input;
      }
    `);

    expect(findDocumentationConstraintsErrors("file.ts", source)).toEqual([]);
  });

  it("allows missing @returns for exported functions explicitly typed as Promise<void>", () => {
    const source = toFileSource(`
      /**
       * Runs operation.
       * @param input - Input value.
       * @example
       * run(input)
       */
      export const run = async (input: string): Promise<void> => {
        void input;
      };
    `);

    expect(findDocumentationConstraintsErrors("file.ts", source)).toEqual([]);
  });

  it("requires @throws when an exported function throws", () => {
    const source = toFileSource(`
      /**
       * Runs operation.
       * @param input - Input value.
       * @returns Result value.
       * @example
       * run(input)
       */
      export function run(input: string): string {
        if (input.length === 0) {
          throw new Error("missing");
        }
        return input;
      }
    `);
    const errors = findDocumentationConstraintsErrors("file.ts", source);

    expect(errors).toContain(
      'file.ts: exported function "run" JSDoc must include @throws when function throws.',
    );
  });

  it("does not require @throws for throws in nested function bodies", () => {
    const source = toFileSource(`
      /**
       * Runs operation.
       * @param input - Input value.
       * @returns Result value.
       * @example
       * run(input)
       */
      export function run(input: string): string {
        /**
         * Reads nested value.
         * @returns Nested value.
         */
        const read = (): string => {
          if (input.length === 0) {
            throw new Error("missing");
          }
          return input;
        };
        return read();
      }
    `);

    expect(findDocumentationConstraintsErrors("file.ts", source)).toEqual([]);
  });

  it('rejects function summaries that start with "Handles "', () => {
    const source = toFileSource(`
      /**
       * Handles operation.
       */
      function helper() {}
    `);
    const errors = findDocumentationConstraintsErrors("file.ts", source);

    expect(errors).toContain(
      'file.ts: function "helper" JSDoc summary must not start with "Handles ".',
    );
  });

  it('rejects function summaries that start with "Converts values to "', () => {
    const source = toFileSource(`
      /**
       * converts values to output records.
       */
      function helper() {}
    `);
    const errors = findDocumentationConstraintsErrors("file.ts", source);

    expect(errors).toContain(
      'file.ts: function "helper" JSDoc summary must not start with "Converts values to ".',
    );
  });
});
