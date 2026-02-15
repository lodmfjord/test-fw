/** @fileoverview Implements cors types. @module libs/http-api-contract/src/cors-types */
export type GlobalCors = {
  allowCredentials?: boolean;
  allowHeaders?: string[];
  allowOrigin: string;
  exposeHeaders?: string[];
  maxAgeSeconds?: number;
};
