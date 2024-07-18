import { Project, SourceFile } from "ts-morph";
import path from "node:path";
import { _ } from "@dasaplan/ts-sdk";
import { tsEnsureDiscriminatorValues } from "./ts/ts-ensure-discriminator-values.js";
import { deleteUnwantedFiles } from "./ts/delete-unwanted-files.js";

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

function createTsMorphSrcFile(tsFilePath: string) {
  const project = new Project();
  project.addSourceFileAtPath(tsFilePath);
  const sourceFile = project.getSourceFile(path.basename(tsFilePath));
  if (_.isNil(sourceFile)) {
    throw `Error: Expected source file for provided path: srcFile: ${tsFilePath}`;
  }
  return { project, sourceFile: sourceFile };
}
