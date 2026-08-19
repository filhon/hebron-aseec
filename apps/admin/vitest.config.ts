import { defineConfig } from "vitest/config";

export default defineConfig({
  // tsconfig usa "jsx": "preserve" (Next.js transforma via SWC no build
  // real) — fora do pipeline do Next, o esbuild do Vite não tem como
  // inferir isso e cai no runtime clássico (`React.createElement` global,
  // sem import). Precisa declarar "automatic" explicitamente para testes
  // que importam um Server Component (.tsx) diretamente.
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/__tests__/**/*.test.ts"],
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
    testTimeout: 30_000,
    hookTimeout: 30_000,
    setupFiles: ["./src/__tests__/setup-env.ts"],
  },
});
