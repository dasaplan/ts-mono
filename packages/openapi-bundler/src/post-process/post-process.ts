import { OpenApiBundled } from "../bundle.js";
import { ensureDiscriminatorValues } from "./processors/ensure-discriminator-values.js";
import { mergeAllOf } from "./processors/merge-all-of.js";
import { xOmit } from "./processors/x-omit.js";

export interface PostProcessingOptions {
  mergeAllOf?: boolean;
  ensureDiscriminatorValues?: boolean;
  xOmit?: boolean;
}

export function createSpecProcessor(options: PostProcessingOptions) {
  const processors: Array<(spec: OpenApiBundled) => OpenApiBundled> = [];
  if (options.mergeAllOf) processors.push(mergeAllOf);
  if (options.ensureDiscriminatorValues) processors.push(ensureDiscriminatorValues);
  if (options.xOmit) processors.push(xOmit);

  if (processors.length < 1) {
    return undefined;
  }
  return (spec: OpenApiBundled) => processors.reduce((acc, curr) => curr(acc), spec);
}
