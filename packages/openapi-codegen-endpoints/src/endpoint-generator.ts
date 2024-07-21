/* eslint-disable @typescript-eslint/no-unused-vars */
import { appLog } from "./logger.js";
import { bundleParseOpenapi, OpenApiBundled } from "@dasaplan/openapi-bundler";
import { _, Folder, File } from "@dasaplan/ts-sdk";
import { Project, ScriptKind, ts } from "ts-morph";
import path from "node:path";
import { Templates } from "./templates.js";
import { EndpointInterfaceGeneratorOptions, generateEndpointInterfacesAsText } from "./endpoint-interfaces.js";
import { pascalCase } from "pascal-case";

export interface EndpointDefinitionGeneratorOptions extends EndpointInterfaceGeneratorOptions {
  outDir: string;
  templatesDir?: string;
}

export async function generateEndpointDefinitions(openapiSpec: string, params: EndpointDefinitionGeneratorOptions) {
  appLog.childLog(generateEndpointDefinitions).info(`start generate:`, openapiSpec);
  const bundled = await bundleParseOpenapi(openapiSpec, { mergeAllOf: true, ensureDiscriminatorValues: true });
  return await generateEndpointDefinitionsFromBundled(bundled, params);
}

export async function generateEndpointDefinitionsFromBundled(bundled: OpenApiBundled, params: EndpointDefinitionGeneratorOptions) {
  const apiName = createApiName(bundled, params);
  const endpoints = await generateEndpointInterfacesAsText(bundled, { ...params, apiName });
  const withImports = ["import {EndpointDefinition} from './EndpointDefinition'", endpoints].join("\n");

  const out = Folder.of(params?.outDir ?? "out").create();
  const { project } = await generateTemplates({ ...params, outDir: out.absolutePath });

  createTsMorphSrcFileFromText(out.makeFile(`${apiName}.ts`).absolutePath, withImports, project);
  await project.save();

  return project.getSourceFiles().map((s) => s.getText());
}

export function createApiName(bundled: OpenApiBundled, params: EndpointDefinitionGeneratorOptions) {
  const rawApiName = params.apiName ?? bundled.info.title;
  const apiName = pascalCase(rawApiName);
  const name = _.isEmpty(apiName) ? "Api" : apiName;
  return `${name}Endpoints`;
}

async function generateTemplates(params: EndpointDefinitionGeneratorOptions, project: Project = new Project()) {
  const endpointTmpl = Templates.getTemplateFile("EndpointDefinition.d.ts");
  const source = createTsMorphSrcFile(endpointTmpl.absolutePath, project);

  const outFile = File.resolve(params.outDir, endpointTmpl.name);
  source.sourceFile.copy(outFile.absolutePath, { overwrite: true });
  return { project, sourceFile: source.sourceFile };
}

function createTsMorphSrcFile(tsFilePath: string, project: Project = new Project()) {
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

function createTsMorphSrcFileFromText(tsFilePath: string, text: string | object, project: Project = new Project()) {
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
