import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});