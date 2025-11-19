/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_LINERA?: string;
  readonly VITE_LINERA_GRAPHQL_URL?: string;
  readonly VITE_LINERA_CHAIN_ID?: string;
  readonly GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
