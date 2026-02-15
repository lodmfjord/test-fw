/**
 * @fileoverview Tests getHandlerFromSource behavior.
 */
import { describe, expect, it } from "bun:test";
import { getHandlerFromSource } from "./execute-lambda-js-test-helpers";

describe("getHandlerFromSource", () => {
  it("creates an executable lambda handler from source", async () => {
    const handler = getHandlerFromSource(`
      export async function handler() {
        return {
          body: JSON.stringify({ ok: true }),
          headers: { "content-type": "application/json" },
          statusCode: 200
        };
      }
    `);

    const response = await handler({});

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("application/json");
    expect(JSON.parse(response.body)).toEqual({ ok: true });
  });

  it("rejects sources that still contain imports", () => {
    expect(() =>
      getHandlerFromSource(`
        import { something } from "./other";
        export async function handler() {
          return { body: "ok", headers: {}, statusCode: 200 };
        }
      `),
    ).toThrow("Imports are forbidden in enclosed lambda runtime");
  });
});
