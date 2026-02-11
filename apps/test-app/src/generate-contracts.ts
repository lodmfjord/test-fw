import { fileURLToPath } from "node:url";
import {
  listDefinedEndpoints,
  writeContractFiles,
  writeLambdaJsFiles,
} from "@simple-api/http-api-contract";
import { testAppContract } from "./test-app-contract";
import "./endpoints";

if (import.meta.main) {
  const endpointModulePath = fileURLToPath(new URL("./endpoints.ts", import.meta.url));
  const contractFiles = await writeContractFiles("dist/contracts", testAppContract);
  const lambdaFiles = await writeLambdaJsFiles("dist/lambda-js", listDefinedEndpoints(), {
    endpointModulePath,
  });
  console.log(
    `Generated ${contractFiles.length} contract files and ${lambdaFiles.length} lambda js files`,
  );
}
