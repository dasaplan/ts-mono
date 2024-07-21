import { defineConfig, configDefaults } from "vitest/config";
export default defineConfig({
  test: {
    watch: false,
    minWorkers: 3,
    workspace: "../../vitest.workspaces.ts",
  },
});
