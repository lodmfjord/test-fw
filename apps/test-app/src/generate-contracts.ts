import { fileURLToPath } from "node:url";
import {
  listDefinedEndpoints,
  writeContractFiles,
  writeLambdaJsFiles,
} from "@simple-api/http-api-contract";
import { testAppContract } from "./test-app-contract";
import "./endpoints";

const LAYER_EXTERNAL_MODULES = ["@aws-sdk/client-dynamodb", "@aws-sdk/util-dynamodb"];

if (import.meta.main) {
  const endpointModulePath = fileURLToPath(new URL("./endpoints.ts", import.meta.url));
  const contractFiles = await writeContractFiles("dist/contracts", testAppContract);
  const lambdaFiles = await writeLambdaJsFiles("dist/lambda-js", listDefinedEndpoints(), {
    endpointModulePath,
    externalModules: LAYER_EXTERNAL_MODULES,
  });
  console.log(
    `Generated ${contractFiles.length} contract files and ${lambdaFiles.length} lambda js files`,
  );
}
