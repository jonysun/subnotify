import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    globals: true,
    include: ["test/**/*.spec.ts", "test/**/*.e2e-spec.ts"],
    testTimeout: 20000
  }
});