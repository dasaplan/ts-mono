import { createRequire } from "node:module";

export function resolveSpecPath(spec: string) {
  const require = createRequire(import.meta.url);
  return require.resolve(`openapi-example-specs/specs/${spec}`);
}
