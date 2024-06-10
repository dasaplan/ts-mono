import { Project, SourceFile } from "ts-morph";
import path from "node:path";
import { _ } from "@dasaplan/ts-sdk";
import { zodReplaceAnd } from "./zod/zod-replace-and.js";
import { tsEnsureDiscriminatorValues } from "./ts/ts-ensure-discriminator-values.js";
import { deleteUnwantedFiles } from "./ts/delete-unwanted-files.js";
import { OpenApiBundled } from "../bundle.js";
import { ensureDiscriminatorValues } from "./spec/ensure-discriminator-values.js";
import { mergeAllOf } from "./spec/merge-all-of.js";
import { zodEnsureUnknownEnumVariant } from "./zod/zod-ensure-unknown-enum.js";

export function createSpecProcessor(options: { mergeAllOf?: boolean; ensureDiscriminatorValues?: boolean }) {
  const processors: Array<(spec: OpenApiBundled) => OpenApiBundled> = [];
  if (options.mergeAllOf) processors.push(mergeAllOf);
  if (options.ensureDiscriminatorValues) processors.push(ensureDiscriminatorValues);
  return (spec: OpenApiBundled) => processors.reduce((acc, curr) => curr(acc), spec);
}

export function createTsPostProcessor(options: { deleteUnwantedFiles?: boolean; ensureDiscriminatorValues?: boolean }) {
  const processors: Array<(api: SourceFile) => SourceFile> = [];
  if (options.ensureDiscriminatorValues) processors.push(tsEnsureDiscriminatorValues);
  return (spec: string) => {
    const { project, sourceFile } = createTsMorphSrcFile(spec);
    processors.reduce((acc, curr) => curr(acc), sourceFile);
    if (options.deleteUnwantedFiles) deleteUnwantedFiles(spec);
    project.saveSync();
    return spec;
  };
}

export function createZodPostProcessor(options: { replaceAndWithMerge?: boolean; ensureUnknownEnumVariant?: boolean }) {
  const processors: Array<(api: SourceFile) => SourceFile> = [];
  if (options.replaceAndWithMerge) processors.push(zodReplaceAnd);
  if (options.ensureUnknownEnumVariant) processors.push(zodEnsureUnknownEnumVariant);
  return (spec: string) => {
    const { project, sourceFile } = createTsMorphSrcFile(spec);
    processors.reduce((acc, curr) => curr(acc), sourceFile);
    project.saveSync();
    return spec;
  };
}

function createTsMorphSrcFile(tsFilePath: string) {
  const project = new Project();
  project.addSourceFileAtPath(tsFilePath);
  const sourceFile = project.getSourceFile(path.basename(tsFilePath));
  if (_.isNil(sourceFile)) {
    throw `Error: Expected source file for provided path: srcFile: ${tsFilePath}`;
  }
  return { project, sourceFile: sourceFile };
}
