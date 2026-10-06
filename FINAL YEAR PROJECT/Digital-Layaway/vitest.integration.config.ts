import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import path from 'node:path';

// Integration tests hit the real Supabase project (RLS, RPC atomicity) — they need
// VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY from .env, and run sequentially since
// several of them intentionally race concurrent requests against the same row.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      environment: 'node',
      include: ['tests/integration/**/*.test.ts'],
      testTimeout: 20000,
      hookTimeout: 20000,
      fileParallelism: false,
      env,
    },
  };
});
