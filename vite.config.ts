/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  clearScreen: false,
  server: { port: 1420, strictPort: true, watch: { ignored: ['**/src-tauri/**'] } },
  build: {
    target: 'chrome120',
    // No data: URIs for assets: everything is a file served from 'self'.
    assetsInlineLimit: 0,
    cssCodeSplit: false,
  },
  test: { include: ['src/**/*.test.ts'] },
});
