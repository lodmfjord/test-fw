/**
 * @fileoverview Tests create dev app.
 */
import { describe, expect, it } from "bun:test";
import { createDevApp } from "./create-dev-app";
import { defineEndpoint } from "./define-endpoint";
import { schema } from "@babbstack/schema";

describe("createDevApp", () => {
  it("runs many endpoints through one dev app", async () => {
    const fetch = createDevApp([
      defineEndpoint({
        method: "GET",
        path: "/health",
        handler: () => ({
          value: { status: "ok" },
        }),
        response: schema.object({
          status: schema.string(),
        }),
      }),
      defineEndpoint({
        method: "POST",
        path: "/users",
        handler: ({ body }) => ({
          value: { id: `user-${body.name}` },
        }),
        request: {
          body: schema.object({
            name: schema.string(),
          }),
        },
        response: schema.object({
          id: schema.string(),
        }),
      }),
    ]);
    const healthResponse = await fetch(new Request("http://local/health", { method: "GET" }));
    expect(healthResponse.status).toBe(200);
    const userResponse = await fetch(
      new Request("http://local/users", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ name: "sam" }),
      }),
    );
    expect(userResponse.status).toBe(200);
    const payload = (await userResponse.json()) as { id?: string };
    expect(payload.id).toBe("user-sam");
  });

  it("returns 400 for invalid input", async () => {
    const fetch = createDevApp([
      defineEndpoint({
        method: "POST",
        path: "/users",
        handler: ({ body }) => ({
          value: { id: body.name },
        }),
        request: {
          body: schema.object({
            name: schema.string(),
          }),
        },
        response: schema.object({
          id: schema.string(),
        }),
      }),
    ]);

    const response = await fetch(
      new Request("http://local/users", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ name: 1 }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("uses statusCode from handler output when provided", async () => {
    const fetch = createDevApp([
      defineEndpoint({
        method: "POST",
        path: "/users",
        handler: ({ body }) => ({
          statusCode: 201,
          value: { id: body.name },
        }),
        request: {
          body: schema.object({
            name: schema.string(),
          }),
        },
        response: schema.object({
          id: schema.string(),
        }),
      }),
    ]);

    const response = await fetch(
      new Request("http://local/users", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ name: "sam" }),
      }),
    );
    expect(response.status).toBe(201);
    expect((await response.json()) as { id?: string }).toEqual({ id: "sam" });
  });

  it("returns 404 for malformed percent-encoded path params", async () => {
    const fetch = createDevApp([
      defineEndpoint({
        method: "GET",
        path: "/users/:id",
        handler: ({ params }) => ({
          value: { id: params.id },
        }),
        request: {
          params: schema.object({
            id: schema.string(),
          }),
        },
        response: schema.object({
          id: schema.string(),
        }),
      }),
    ]);

    const response = await fetch(
      new Request("http://local/users/%E0%A4%A", {
        method: "GET",
      }),
    );

    expect(response.status).toBe(404);
  });
});
