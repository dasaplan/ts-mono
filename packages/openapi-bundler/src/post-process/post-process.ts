import { OpenApiBundled } from "../bundle.js";
import { ensureDiscriminatorValues } from "./spec/ensure-discriminator-values.js";
import { mergeAllOf } from "./spec/merge-all-of.js";

export function createSpecProcessor(options: { mergeAllOf?: boolean; ensureDiscriminatorValues?: boolean }) {
  const processors: Array<(spec: OpenApiBundled) => OpenApiBundled> = [];
  if (options.mergeAllOf) processors.push(mergeAllOf);
  if (options.ensureDiscriminatorValues) processors.push(ensureDiscriminatorValues);
  return (spec: OpenApiBundled) => processors.reduce((acc, curr) => curr(acc), spec);
}

