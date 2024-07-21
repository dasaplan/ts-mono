import { configDefaults, defineWorkspace } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineWorkspace([
  // you can use a list of glob patterns to define your workspaces
  // Vitest expects a list of config files
  // or directories where there is a config file
  "packages/*",
  {
    plugins: [tsconfigPaths()],
    test: {
      exclude: [
        ...configDefaults.exclude,
        "out",
        "dist",
        "node_modules",
        "**/*.it.test.{ts,js}",
      ],
      include: ["src/**/*.test.{ts,js}"],
      // it is recommended to define a name when using inline configs
      name: "unit-test",
    },
  },
  {
    plugins: [tsconfigPaths()],
    test: {
      exclude: [...configDefaults.exclude, "out", "dist", "node_modules"],
      include: ["**/*.it.test.{ts,js}"],
      // it is recommended to define a name when using inline configs
      name: "integration-test",
    },
  },
  // "tests/*/vitest.config.{e2e,unit}.ts",
  // // you can even run the same tests,
  // // but with different configs in the same "vitest" process
  // {
  //   test: {
  //     name: "happy-dom",
  //     root: "./shared_tests",
  //     environment: "happy-dom",
  //     setupFiles: ["./setup.happy-dom.ts"],
  //   },
  // },
  // {
  //   test: {
  //     name: "node",
  //     root: "./shared_tests",
  //     environment: "node",
  //     setupFiles: ["./setup.node.ts"],
  //   },
  // },
]);
