import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: [
      "src/__tests__/**/*.test.ts",
      "src/actions/__tests__/**/*.test.ts",
    ],
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
    testTimeout: 30_000,
    hookTimeout: 30_000,
    setupFiles: ["./src/__tests__/setup-env.ts"],
  },
});
