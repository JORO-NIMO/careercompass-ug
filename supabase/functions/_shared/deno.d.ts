// Deno types for Edge Functions
// This file provides type definitions for Deno runtime

declare namespace Deno {
  export const env: {
    get(key: string): string | undefined;
  };
}

declare const crypto: Crypto;

export {};
