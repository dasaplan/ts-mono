import { Project, ScriptKind, ts } from "ts-morph";
import path from "node:path";
import { _ } from "@dasaplan/ts-sdk";

export function createTsMorphSrcFile(tsFilePath: string, project: Project = new Project()) {
  project.addSourceFileAtPath(tsFilePath);
  const sourceFile = project.getSourceFile(path.basename(tsFilePath));
  sourceFile?.formatText({
    indentSwitchCase: true,
    indentStyle: ts.IndentStyle.Smart,
    indentMultiLineObjectLiteralBeginningOnBlankLine: true,
  });

  if (_.isNil(sourceFile)) {
    throw `Error: Expected source file for provided path: srcFile: ${tsFilePath}`;
  }
  return { project, sourceFile: sourceFile };
}

export function createTsMorphSrcFileFromText(tsFilePath: string, text: string | object, project: Project = new Project()) {
  project.createSourceFile(tsFilePath, text, { overwrite: true, scriptKind: ScriptKind.TS });
  const sourceFile = project.getSourceFile(path.basename(tsFilePath));
  sourceFile?.formatText({
    indentSwitchCase: true,
    indentStyle: ts.IndentStyle.Smart,

    indentMultiLineObjectLiteralBeginningOnBlankLine: true,
  });
  if (_.isNil(sourceFile)) {
    throw `Error: Expected source file for provided path: srcFile: ${tsFilePath}`;
  }
  return { project, sourceFile: sourceFile };
}
