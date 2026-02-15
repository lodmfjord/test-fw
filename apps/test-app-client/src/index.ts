/**
 * @fileoverview Implements index.
 */
import { createClient } from "@babbstack/client";
import { createLogger } from "@babbstack/logger";
import type { endpoints as testAppEndpoints } from "../../test-app/src/endpoints";

type TestAppEndpoints = typeof testAppEndpoints;

const baseUrl = process.argv[2] ?? "http://localhost:3000";
const client = createClient<TestAppEndpoints>(baseUrl);
const logger = createLogger({
  serviceName: "test-app-client",
});

/** Runs expect type. */ function expectType<TValue>(_value: TValue): void {}

/** Runs run. */ async function run(): Promise<void> {
  const lastUpdate = await client.request.GET["last-update"]({});
  const stepFunctionDemo = await client.request.POST["step-function-demo"]({
    body: { value: "demo" },
  });
  const putOrder = await client.request.PUT["order/{id}"]({
    body: { amount: 99 },
    params: { id: "order-1" },
  });
  const patchOrder = await client.request.PATCH["order/{id}"]({
    body: { status: "closed" },
    params: { id: "order-1" },
  });
  const deleteOrder = await client.request.DELETE["order/{id}"]({
    params: { id: "order-1" },
  });
  const optionsOrder = await client.request.OPTIONS.order({});
  const headOrder = await client.request.HEAD["order/{id}"]({
    params: { id: "order-1" },
  });

  expectType<{ time: string }>(lastUpdate.data);
  expectType<{ ok: boolean; source: string }>(stepFunctionDemo.data);
  expectType<{ amount: number; id: string; status: string }>(putOrder.data);
  expectType<{ id: string; status: string }>(patchOrder.data);
  expectType<{ deleted: boolean; id: string }>(deleteOrder.data);
  expectType<{ methods: string[] }>(optionsOrder.data);
  expectType<{ exists: boolean }>(headOrder.data);

  logger.info("test-app-client smoke results");
  logger.info("GET /last-update", { response: lastUpdate });
  logger.info("POST /step-function-demo", { response: stepFunctionDemo });
  logger.info("PUT /order/{id}", { response: putOrder });
  logger.info("PATCH /order/{id}", { response: patchOrder });
  logger.info("DELETE /order/{id}", { response: deleteOrder });
  logger.info("OPTIONS /order", { response: optionsOrder });
  logger.info("HEAD /order/{id}", { response: headOrder });
}

try {
  await run();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  logger.error("test-app-client smoke failed", { baseUrl, message });
  process.exit(1);
}
