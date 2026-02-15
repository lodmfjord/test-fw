import { createClient } from "@babbstack/client";
import type { endpoints as testAppEndpoints } from "../../test-app/src/endpoints";

type TestAppEndpoints = typeof testAppEndpoints;

const baseUrl = process.argv[2] ?? "http://localhost:3000";
const client = createClient<TestAppEndpoints>(baseUrl);

function expectType<TValue>(_value: TValue): void {}

async function run(): Promise<void> {
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

  console.log("test-app-client smoke results");
  console.log("GET /last-update", lastUpdate);
  console.log("POST /step-function-demo", stepFunctionDemo);
  console.log("PUT /order/{id}", putOrder);
  console.log("PATCH /order/{id}", patchOrder);
  console.log("DELETE /order/{id}", deleteOrder);
  console.log("OPTIONS /order", optionsOrder);
  console.log("HEAD /order/{id}", headOrder);
}

try {
  await run();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("test-app-client smoke failed", { baseUrl, message });
  process.exit(1);
}
