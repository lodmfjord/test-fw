import { createDevApp } from "@babbstack/http-api-contract";
import { endpoints } from "./endpoints";

export const testAppFetch = createDevApp(endpoints.flat());
