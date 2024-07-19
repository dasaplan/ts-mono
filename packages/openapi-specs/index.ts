import { Imports } from "@dasaplan/ts-sdk";

export function resolveSpecPath(spec: string) {
  return Imports.resolve(`openapi-example-specs/specs/${spec}`);
}
