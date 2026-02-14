export type TerraformResourceSelection = {
  apiGateway: boolean;
  dynamodb: boolean;
  lambdas: boolean;
  sqs: boolean;
};

type TerraformDisabledStateSettings = {
  enabled: false;
};

type TerraformEnabledStateSettings = {
  enabled?: true;
  bucket: string;
  encrypt: boolean;
  keyPrefix: string;
  lockTableName?: string;
};

export type TerraformStateSettings = TerraformDisabledStateSettings | TerraformEnabledStateSettings;

export type TerraformGeneratorSettings = {
  enabled: boolean;
  outputDirectory: string;
  region: string;
  resources: TerraformResourceSelection;
  state?: TerraformStateSettings;
};

export type ContractGeneratorSettings = {
  appName?: string;
  contractExportName?: string;
  contractModulePath: string;
  contractsOutputDirectory: string;
  endpointExportName: string;
  endpointModulePath: string;
  externalModules?: string[];
  lambdaOutputDirectory: string;
  prefix?: string;
  terraform?: TerraformGeneratorSettings;
};

export type ContractGeneratorOutput = {
  contractFiles: string[];
  lambdaFiles: string[];
  terraformFiles?: string[];
};
