import { OpenApiBundled } from "../bundle.js";
import { ensureDiscriminatorValues } from "./processors/ensure-discriminator-values.js";
import { mergeAllOf } from "./processors/merge-all-of.js";
import { xOmit } from "./processors/x-omit.js";
import { xPick } from "./processors/x-pick.js";

export interface PostProcessingOptions {
  mergeAllOf?: boolean;
  ensureDiscriminatorValues?: boolean;
  xOmit?: boolean;
  xPick?: boolean;
}

export function createSpecProcessor(options: PostProcessingOptions = defaultPostProcessingOptions()) {
  const processors: Array<(spec: OpenApiBundled) => OpenApiBundled> = [];

  if (options.mergeAllOf) processors.push(mergeAllOf);
  if (options.ensureDiscriminatorValues) processors.push(ensureDiscriminatorValues);
  if (options.xOmit) processors.push(xOmit);
  if (options.xPick) processors.push(xPick);

  if (processors.length < 1) {
    return undefined;
  }

  return (spec: OpenApiBundled) => processors.reduce((acc, curr) => curr(acc), spec);
}

export function defaultPostProcessingOptions(): PostProcessingOptions {
  return {
    xOmit: true,
    xPick: true,
    ensureDiscriminatorValues: true,
    mergeAllOf: true,
  };
}
