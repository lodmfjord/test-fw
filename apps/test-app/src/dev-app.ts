import { createDevApp, listDefinedEndpoints } from "@simple-api/http-api-contract";
import "./endpoints";

export const testAppFetch = createDevApp(listDefinedEndpoints());

if (import.meta.main) {
  const port = Number(process.env.PORT ?? "3000");
  Bun.serve({
    fetch: testAppFetch,
    port,
  });
  console.log(`test-app dev server listening on http://localhost:${port}`);
}
