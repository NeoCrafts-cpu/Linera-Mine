/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Linera WASM Client Configuration
  readonly VITE_USE_LINERA?: string;
  readonly VITE_LINERA_APP_ID?: string;
  readonly VITE_LINERA_FAUCET_URL?: string;
  
  // Optional: For backward compatibility (deprecated)
  readonly VITE_LINERA_GRAPHQL_URL?: string;
  readonly VITE_LINERA_CHAIN_ID?: string;
  
  // Other
  readonly GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
