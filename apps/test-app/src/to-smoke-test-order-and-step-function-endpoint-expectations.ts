/**
 * @fileoverview Builds deployed smoke-test expectations for order and step-function routes.
 */
import type { EndpointExpectation } from "./smoke-test-deployed-api-types";

const smokeOrderId = "smoke-order-123";
const smokeEventId = "smoke-event-123";

/** Runs assert object. */
function assertObject(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(message);
  }

  return value as Record<string, unknown>;
}

/** Runs assert string value. */
function assertStringValue(value: unknown, message: string): string {
  if (typeof value !== "string") {
    throw new Error(message);
  }

  return value;
}

/** Runs assert number value. */
function assertNumberValue(value: unknown, message: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(message);
  }

  return value;
}

/**
 * Converts to order and step-function endpoint expectations.
 * @example
 * toSmokeTestOrderAndStepFunctionEndpointExpectations()
 * @returns Output value.
 */
export function toSmokeTestOrderAndStepFunctionEndpointExpectations(): EndpointExpectation[] {
  return [
    {
      body: { amount: 42 },
      expectedStatusCode: 200,
      method: "PUT",
      name: "order-put",
      path: `/order/${smokeOrderId}`,
      validate(payload) {
        const parsed = assertObject(payload, "Expected PUT /order/{id} response object");
        if (parsed.id !== smokeOrderId || parsed.status !== "updated") {
          throw new Error("Expected PUT /order/{id} id and status to match");
        }
      },
    },
    {
      body: { status: "shipped" },
      expectedStatusCode: 200,
      method: "PATCH",
      name: "order-patch",
      path: `/order/${smokeOrderId}`,
      validate(payload) {
        const parsed = assertObject(payload, "Expected PATCH /order/{id} response object");
        if (parsed.id !== smokeOrderId || parsed.status !== "shipped") {
          throw new Error("Expected PATCH /order/{id} id and status to match");
        }
      },
    },
    {
      expectedStatusCode: 200,
      method: "HEAD",
      name: "order-head",
      path: `/order/${smokeOrderId}`,
      validate(_, response) {
        const orderHeader = response.headers.get("x-order-id") ?? "";
        if (orderHeader !== smokeOrderId) {
          throw new Error(
            `Expected HEAD /order/{id} x-order-id ${smokeOrderId}, received ${orderHeader}`,
          );
        }
      },
    },
    {
      expectedStatusCode: 204,
      method: "OPTIONS",
      name: "order-options",
      path: "/order",
      validate(payload) {
        if (payload !== "") {
          throw new Error(`Expected empty OPTIONS /order payload, received ${String(payload)}`);
        }
      },
    },
    {
      expectedStatusCode: 200,
      method: "DELETE",
      name: "order-delete",
      path: `/order/${smokeOrderId}`,
      validate(payload) {
        const parsed = assertObject(payload, "Expected DELETE /order/{id} response object");
        if (parsed.id !== smokeOrderId || parsed.deleted !== true) {
          throw new Error("Expected DELETE /order/{id} id and deleted=true");
        }
      },
    },
    {
      body: { value: "demo" },
      expectedStatusCode: 200,
      method: "POST",
      name: "step-function-demo-success",
      path: "/step-function-demo",
      validate(payload) {
        const parsed = assertObject(payload, "Expected /step-function-demo response object");
        if (parsed.ok !== true || parsed.source !== "step-function") {
          throw new Error("Expected /step-function-demo ok=true and source=step-function");
        }
      },
    },
    {
      body: { value: 1 },
      expectedStatusCode: 400,
      method: "POST",
      name: "step-function-demo-invalid-body",
      path: "/step-function-demo",
      validate(payload) {
        const parsed = assertObject(payload, "Expected /step-function-demo 400 response object");
        assertStringValue(parsed.error, "Expected /step-function-demo 400 error string");
      },
    },
    {
      expectedStatusCode: 200,
      method: "POST",
      name: "step-function-random-branch",
      path: "/step-function-random-branch",
      validate(payload) {
        const parsed = assertObject(
          payload,
          "Expected /step-function-random-branch response object",
        );
        assertStringValue(parsed.branch, "Expected /step-function-random-branch branch string");
        assertNumberValue(parsed.random, "Expected /step-function-random-branch random number");
      },
    },
    {
      body: { eventId: smokeEventId },
      expectedStatusCode: 200,
      method: "POST",
      name: "step-function-events",
      path: "/step-function-events",
      validate(payload) {
        const parsed = assertObject(payload, "Expected /step-function-events response object");
        if (parsed.accepted !== true || parsed.eventId !== smokeEventId) {
          throw new Error("Expected /step-function-events accepted=true with matching eventId");
        }
      },
    },
  ];
}
