import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // ...
    exclude: ["out", "dist", "node_modules"],
    watch: false,
    minWorkers: 3,
  },
});
