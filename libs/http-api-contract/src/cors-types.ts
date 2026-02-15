/**
 * @fileoverview Implements cors types.
 */
export type GlobalCors = {
  allowCredentials?: boolean;
  allowHeaders?: string[];
  allowOrigin: string;
  exposeHeaders?: string[];
  maxAgeSeconds?: number;
};
