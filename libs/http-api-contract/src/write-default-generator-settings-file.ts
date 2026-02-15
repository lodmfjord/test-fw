import { access, writeFile } from "node:fs/promises";

const DEFAULT_SETTINGS_TEMPLATE = `{
  // optional app name used by generated terraform naming; defaults to contract apiName
  "appName": "my-app",
  "contractExportName": "contract",
  "contractModulePath": "./src/contract.ts",
  "contractsOutputDirectory": "./dist/contracts",
  // endpoint module should export an array named "endpoints" (nested arrays are supported)
  "endpointExportName": "endpoints",
  "endpointModulePath": "./src/endpoints.ts",
  // packages must be installed in this app and are layered only for lambdas that need them
  // note: zod is always treated as an external runtime dependency for generated route lambdas
  "externalModules": ["@aws-sdk/client-dynamodb", "@aws-sdk/util-dynamodb", "@aws-sdk/client-sqs"],
  "lambdaOutputDirectory": "./dist/lambda-js",
  "prefix": "babb",
  "terraform": {
    "enabled": true,
    "outputDirectory": "./dist",
    "region": "eu-west-1",
    "resources": {
      "apiGateway": true,
      "dynamodb": true,
      "lambdas": true,
      "sqs": true
    }
  }
}
`;

async function assertFileDoesNotExist(path: string): Promise<void> {
  try {
    await access(path);
  } catch {
    return;
  }

  throw new Error(
    `Settings file already exists: ${path}. Delete it or choose another path with --settings.`,
  );
}

export async function writeDefaultGeneratorSettingsFile(path: string): Promise<void> {
  await assertFileDoesNotExist(path);
  await writeFile(path, DEFAULT_SETTINGS_TEMPLATE, "utf8");
}
