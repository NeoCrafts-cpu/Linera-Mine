import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        headers: {
          // Required for SharedArrayBuffer - must use require-corp for crossOriginIsolated
          'Cross-Origin-Embedder-Policy': 'require-corp',
          'Cross-Origin-Opener-Policy': 'same-origin',
        },
      },
      preview: {
        headers: {
          'Cross-Origin-Embedder-Policy': 'require-corp',
          'Cross-Origin-Opener-Policy': 'same-origin',
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      optimizeDeps: {
        // Don't optimize @linera/client - it has WASM that needs special handling
        exclude: ['@linera/client'],
        esbuildOptions: {
          target: 'esnext',
        },
      },
      esbuild: {
        supported: {
          'top-level-await': true,
        },
      },
      build: {
        target: 'esnext',
        commonjsOptions: {
          transformMixedEsModules: true,
        },
      },
      // Handle @linera/client as an ES module
      ssr: {
        noExternal: ['@linera/client'],
      },
      assetsInclude: ['**/*.wasm'],
    };
});
