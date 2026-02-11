import { buildContractFromEndpoints, listDefinedEndpoints } from "@babbstack/http-api-contract";
import "./endpoints";

export const testAppContract = buildContractFromEndpoints({
  apiName: "test-app-api",
  version: "0.1.0",
  endpoints: listDefinedEndpoints(),
  env: [
    {
      name: "USERS_TABLE",
      required: true,
      description: "Users table name",
    },
  ],
});
