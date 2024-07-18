import { Source, bundle, createConfig } from "@redocly/openapi-core";
import { oas30 } from "openapi3-ts";
import { _, File, Folder } from "@dasaplan/ts-sdk";
import { appLog } from "./logger.js";

export interface OpenApiBundled extends oas30.OpenAPIObject {}

interface BundleOption {
  postProcessor: (bundled: OpenApiBundled) => OpenApiBundled;
  outFile: string;
}

export async function bundleOpenapi(
  _pathToApi: string,
  params?: Partial<BundleOption>
) {
  appLog.childLog(bundleOpenapi).info("start bundle: ", _pathToApi);
  const { postProcessor } = params ?? {};

  const inputFile = File.of(_pathToApi);
  const outputFile = File.isFilePath(params?.outFile)
    ? File.of(params.outFile)
    : Folder.temp().makeFile(`bundled-${inputFile.name}`);
  const bundleResults = await parseOpenapi(inputFile.absolutPath);
  const parsed: OpenApiBundled = _.isNil(postProcessor)
    ? bundleResults.bundle.parsed
    : postProcessor(bundleResults.bundle.parsed);
  // todo: CatBase in generic does not get cleaned up...
  const cleanedParsed: OpenApiBundled = _.isNil(postProcessor)
    ? parsed
    : (await doBundle(bundleResults.bundle.source, parsed)).bundle.parsed;

  // todo: investigate - for pets-simple it will duplicate schemas...
  if (_.isDefined(parsed.components?.schemas?.["schemas"])) {
    delete parsed.components.schemas["schemas"];
  }
  return { parsed: cleanedParsed, outFile: outputFile.writeYml(cleanedParsed) };
}

export async function parseOpenapi(pathToApi: string) {
  const config = await createConfig({});
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
