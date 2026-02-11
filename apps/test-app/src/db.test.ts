import { describe, expect, it } from "bun:test";
import { pointDatabase, titleDatabase } from "./db";

describe("db schema parsers", () => {
  it("parses valid point and title items", () => {
    expect(
      pointDatabase.parse({
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
      titleDatabase.parse({
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
      pointDatabase.parse({
        id: "point-1",
        name: "alpha",
        points: "not-a-number",
      }),
    ).toThrow("points: expected number");
  });
});
