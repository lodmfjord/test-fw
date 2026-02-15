/**
 * @fileoverview Implements lambda runtime source context type.
 */

export type LambdaRuntimeSourceContext = {
  contextDatabaseHelper: string;
  contextS3Helper: string;
  contextSqsHelper: string;
  dbAccessSupport: string;
  endpointDatabaseBinding: string;
  endpointDatabaseContextLine: string;
  endpointDatabaseValue: string;
  endpointDbLine: string;
  endpointRequestSchemas: Record<string, unknown>;
  endpointResponseByStatusCodeSchemas: Record<string, unknown>;
  endpointResponseSchema: unknown;
  endpointS3Binding: string;
  endpointS3ContextLine: string;
  endpointS3Value: string;
  endpointSqsBinding: string;
  endpointSqsContextLine: string;
  endpointSqsValue: string;
  envBootstrapSource: string;
  prelude: string;
  runtimeDbState: string;
  runtimeS3State: string;
  runtimeSqsState: string;
};
