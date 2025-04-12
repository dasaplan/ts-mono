import { createRequire } from "node:module";

export namespace Imports {
  export function resolve(packageName: string) {
    const require = createRequire(import.meta.url);
    return require.resolve(packageName);
  }
}
