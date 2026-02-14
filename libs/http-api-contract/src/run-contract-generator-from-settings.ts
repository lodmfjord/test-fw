import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { listDefinedSqsListeners, resetDefinedSqsListeners } from "@babbstack/sqs";
import type { ContractGeneratorOutput } from "./contract-generator-types";
import { collectLambdaExternalModulesByRoute } from "./collect-lambda-external-modules-by-route";
import { loadEndpointsFromModule } from "./load-endpoints-from-module";
import { parseJsonc } from "./parse-jsonc";
import { renderTerraformFiles } from "./render-terraform-files";
import { resolvePathFromSettings } from "./resolve-path-from-settings";
import { toContractGeneratorSettings } from "./to-contract-generator-settings";
import { toContract } from "./to-contract";
import { toImportPath } from "./to-import-path";
import { toLambdaLayerMetadata } from "./to-lambda-layer-metadata";
import { toRuntimeEndpointsWithGlobalCorsOptions } from "./to-runtime-endpoints-with-global-cors-options";
import { writeContractFiles } from "./write-contract-files-export";
import { writeLambdaLayerArtifacts } from "./write-lambda-layer-artifacts";
import { writeLambdaFunctionArtifacts } from "./write-lambda-function-artifacts";
import { writeLambdaJsFiles } from "./write-lambda-js-files-export";
import { writeSqsListenerJsFiles } from "./write-sqs-listener-js-files";
import { writeTerraformFiles } from "./write-terraform-files";

export async function runContractGeneratorFromSettings(
  settingsFilePath: string,
): Promise<ContractGeneratorOutput> {
  const source = settingsFilePath.trim();
  if (source.length === 0) {
    throw new Error("settingsFilePath is required");
  }

  const absoluteSettingsPath = resolvePathFromSettings(source, process.cwd());
  const settingsDirectory = dirname(absoluteSettingsPath);
  const settingsSource = await readFile(absoluteSettingsPath, "utf8");

  let parsedSettings: unknown;
  try {
    parsedSettings = parseJsonc(settingsSource);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parse error";
    throw new Error(`Invalid JSON in settings file "${absoluteSettingsPath}": ${message}`);
  }

  const settings = toContractGeneratorSettings(parsedSettings);
  const endpointModulePath = resolvePathFromSettings(
    settings.endpointModulePath,
    settingsDirectory,
  );
  const contractModulePath = resolvePathFromSettings(
    settings.contractModulePath,
    settingsDirectory,
  );
  const contractsOutputDirectory = resolvePathFromSettings(
    settings.contractsOutputDirectory,
    settingsDirectory,
  );
  const lambdaOutputDirectory = resolvePathFromSettings(
    settings.lambdaOutputDirectory,
    settingsDirectory,
  );
  const terraformOutputDirectory =
    settings.terraform?.enabled && settings.terraform.outputDirectory
      ? resolvePathFromSettings(settings.terraform.outputDirectory, settingsDirectory)
      : undefined;

  resetDefinedSqsListeners();
  const endpoints = await loadEndpointsFromModule(endpointModulePath, settings.endpointExportName);
  const sqsListeners = listDefinedSqsListeners();
  const contractModule = (await import(toImportPath(contractModulePath))) as Record<
    string,
    unknown
  >;
  const contract = toContract(
    contractModule[settings.contractExportName ?? "contract"],
    settings.contractExportName ?? "contract",
  );
  const endpointsWithCorsOptions = toRuntimeEndpointsWithGlobalCorsOptions(contract, endpoints);
  const contractFiles = await writeContractFiles(contractsOutputDirectory, contract);
  const routeLambdaFiles = await writeLambdaJsFiles(
    lambdaOutputDirectory,
    endpointsWithCorsOptions,
    {
      endpointModulePath,
      ...(settings.externalModules ? { externalModules: settings.externalModules } : {}),
    },
  );
  const sqsListenerLambdaFiles = await writeSqsListenerJsFiles(
    lambdaOutputDirectory,
    sqsListeners,
    {
      endpointModulePath,
      ...(settings.externalModules ? { externalModules: settings.externalModules } : {}),
    },
  );
  const lambdaFiles = [...routeLambdaFiles, ...sqsListenerLambdaFiles].sort((left, right) =>
    left.localeCompare(right),
  );
  const lambdaExternalModulesByRoute = await collectLambdaExternalModulesByRoute(
    lambdaOutputDirectory,
    lambdaFiles,
    settings.externalModules,
    endpointModulePath,
  );
  const lambdaLayerMetadata = toLambdaLayerMetadata(lambdaExternalModulesByRoute);
  if (terraformOutputDirectory && settings.terraform?.resources.lambdas) {
    await writeLambdaFunctionArtifacts(
      resolvePathFromSettings("lambda-artifacts", terraformOutputDirectory),
      contract.lambdasManifest,
      lambdaOutputDirectory,
      sqsListeners.map((listener) => listener.listenerId),
    );
    await writeLambdaLayerArtifacts(
      resolvePathFromSettings("layer-artifacts", terraformOutputDirectory),
      lambdaLayerMetadata,
      settingsDirectory,
    );
  }
  const terraformFiles =
    terraformOutputDirectory && settings.terraform
      ? await writeTerraformFiles(
          terraformOutputDirectory,
          renderTerraformFiles(contract, endpointsWithCorsOptions, sqsListeners, {
            appName: settings.appName ?? "",
            lambdaExternalModulesByRoute,
            prefix: settings.prefix ?? "",
            ...settings.terraform,
          }),
        )
      : undefined;

  return {
    contractFiles,
    lambdaFiles,
    ...(terraformFiles ? { terraformFiles } : {}),
  };
}
