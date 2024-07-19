import { createRequire } from "node:module";

export module Imports {
  export function resolve(packageName: string) {
    const require = createRequire(import.meta.url);
    return require.resolve(packageName);
  }
}
