import { Source, bundle, createConfig } from "@redocly/openapi-core";
import { oas30 } from "openapi3-ts";
import { _, File, Folder } from "@dasaplan/ts-sdk";
import { appLog } from "./logger.js";
import { createSpecProcessor } from "./post-process/index.js";
import { PostProcessingOptions } from "./post-process/post-process.js";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface OpenApiBundled extends oas30.OpenAPIObject {}

interface RedoclyFilterConfig {
  property: "tags" | "operationId" | string;
  value: Array<string>;
  matchStrategy: "any" | "all";
}
export type RedoclyDecorators = {
  "filter-in"?: RedoclyFilterConfig;
  "filter-out"?: RedoclyFilterConfig;
};

interface BundleOption extends PostProcessingOptions {
  postProcessor: (bundled: OpenApiBundled) => OpenApiBundled;
  outFile: string;
  filter?: RedoclyDecorators;
}

export async function bundleOpenapi(_pathToApi: string, params?: Partial<BundleOption>) {
  appLog.childLog(bundleOpenapi).info("start bundle: ", _pathToApi);
  const inputFile = File.of(_pathToApi);

  const outputFile = File.isFilePath(params?.outFile)
    ? File.of(params.outFile)
    : _.isDefined(params?.outFile)
      ? Folder.of(params.outFile).makeFile(`bundled-${inputFile.name}`)
      : Folder.temp().makeFile(`bundled-${inputFile.name}`);
  const parsed = await bundleParseOpenapi(_pathToApi, params);
  return { parsed, outFile: outputFile.writeYml(parsed) };
}

export async function bundleParseOpenapi(_pathToApi: string, params?: Partial<Omit<BundleOption, "outFile">>): Promise<OpenApiBundled> {
  const inputFile = File.of(_pathToApi);

  appLog.childLog(bundleOpenapi).info("start bundle: ", inputFile.absolutePath);

  const bundleResults = await parseOpenapi(inputFile.absolutePath, { decorators: params?.filter });

  const postProcessor =
    params?.postProcessor ??
    createSpecProcessor({
      mergeAllOf: params?.mergeAllOf,
      ensureDiscriminatorValues: params?.ensureDiscriminatorValues,
      xOmit: params?.xOmit,
      xPick: params?.xPick,
    });

  const parsed: OpenApiBundled = _.isNil(postProcessor) ? bundleResults.bundle.parsed : postProcessor(bundleResults.bundle.parsed);
  // todo: CatBase in generic does not get cleaned up...
  const cleanedParsed: OpenApiBundled = _.isNil(postProcessor) ? parsed : (await doBundle(bundleResults.bundle.source, parsed)).bundle.parsed;

  // todo: investigate - for pets-simple it will duplicate schemas...
  if (_.isDefined(parsed.components?.schemas?.["schemas"])) {
    delete parsed.components.schemas["schemas"];
  }
  return cleanedParsed;
}

export async function parseOpenapi(pathToApi: string, userConfig?: { decorators?: RedoclyDecorators }) {
  appLog.childLog(parseOpenapi).info("-- with decorators");

  const config = await createConfig({
    decorators: userConfig?.decorators,
  });

  return bundle({
    ref: pathToApi,
    config,
    removeUnusedComponents: true,
    dereference: false,
    skipRedoclyRegistryRefs: true,
  });
}

// todo: refactor - we want to remove unused after post-processing
export async function doBundle(source: Source, parsed: object) {
  const config = await createConfig({});
  return bundle({
    doc: { parsed, source },
    config,
    removeUnusedComponents: true,
    dereference: false,
    skipRedoclyRegistryRefs: true,
  });
}
