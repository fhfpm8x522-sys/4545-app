import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// Separate SPA build: preserve the existing Lovable server build configuration.
export default defineConfig({
  base: process.env.PAGES_BASE_PATH || '/4545-app/',
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss(), tsconfigPaths()],
  define: { 'import.meta.env.VITE_STATIC_PAGES': JSON.stringify('true') },
  build: { outDir: 'dist-pages' },
});
