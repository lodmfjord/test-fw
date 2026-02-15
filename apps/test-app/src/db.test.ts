/**
 * @fileoverview Tests db.
 */
import { describe, expect, it } from "bun:test";
import { testDatabases } from "./db";

describe("db schema parsers", () => {
  it("parses valid point and title items", () => {
    expect(
      testDatabases.point.parse({
        id: "point-1",
        name: "alpha",
        points: 3,
      }),
    ).toEqual({
      id: "point-1",
      name: "alpha",
      points: 3,
    });

    expect(
      testDatabases.title.parse({
        enabled: true,
        id: "title-1",
        title: "Bravo",
      }),
    ).toEqual({
      enabled: true,
      id: "title-1",
      title: "Bravo",
    });
  });

  it("returns path-aware validation errors", () => {
    expect(() =>
      testDatabases.point.parse({
        id: "point-1",
        name: "alpha",
        points: "not-a-number",
      }),
    ).toThrow("points: expected number");
  });
});
