import { OpenApiBundled } from "../bundle.js";
import { ensureDiscriminatorValues } from "./processors/ensure-discriminator-values.js";
import { mergeAllOf, MergeAllOfOptions } from "./processors/merge-all-of.js";
import { xOmitDeep } from "./processors/x-omit-deep.js";
import { xPick } from "./processors/x-pick.js";

export interface PostProcessingOptions {
  mergeAllOf?: boolean;
  ensureDiscriminatorValues?: boolean;
  xOmit?: boolean;
  xPick?: boolean;
  processorOptions?: ProcessorOptions;
}

type ProcessorOptions = MergeAllOfOptions;

export function createSpecProcessor(options: PostProcessingOptions = defaultPostProcessingOptions()) {
  const processors: Array<(spec: OpenApiBundled, options: ProcessorOptions | undefined) => OpenApiBundled> = [];

  if (options.mergeAllOf) processors.push(mergeAllOf);
  if (options.ensureDiscriminatorValues) processors.push(ensureDiscriminatorValues);
  if (options.xOmit) processors.push(xOmitDeep);
  if (options.xPick) processors.push(xPick);

  if (processors.length < 1) {
    return undefined;
  }

  return (spec: OpenApiBundled) => processors.reduce((acc, curr) => curr(acc, options.processorOptions), spec);
}

export function defaultPostProcessingOptions(): PostProcessingOptions {
  return {
    xOmit: true,
    xPick: true,
    ensureDiscriminatorValues: true,
    mergeAllOf: true,
  };
}
