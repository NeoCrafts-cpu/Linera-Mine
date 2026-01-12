/**
 * Linera Module - Re-exports for clean imports
 */

// WASM initialization
export { ensureWasmInitialized, isWasmReady, getLinera } from './wasmInit';

// Linera adapter singleton
export { 
  lineraAdapter, 
  LineraAdapterClass,
  type LineraConnection,
  type ApplicationConnection,
} from './lineraAdapter';

// GraphQL queries
export * as Queries from './queries';
