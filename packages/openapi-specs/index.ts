import * as path from "node:path";

export function resolveSpecPath(spec: string) {
  return path.resolve("./node_modules/openapi-example-specs/specs", spec);
}
