import { Imports } from "@dasaplan/ts-sdk";
export type ExampleSpec =
  | "pets/pets-api.yml"
  | "pets/petstore-api.yml"
  | "pets-modular/pets-api.yml"
  | "pets-simple/pets-api.yml"
  | "pets-modular-complex/petstore-api.yml"
  | "generic/api.yml"
  | "pets-recursive/pets-api.yml"
  | "usecases/extended-array-api.yml";

export function resolveSpecPath(spec: ExampleSpec) {
  return Imports.resolve(`openapi-example-specs/specs/${spec}`);
}
