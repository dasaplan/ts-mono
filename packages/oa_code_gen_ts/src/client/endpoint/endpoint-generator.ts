import { appLog } from "./logger.js";
import { bundleParseOpenapi, OpenApiBundled } from "@dasaplan/openapi-bundler";
import { _, Folder, File } from "@dasaplan/ts-sdk";
import { Project } from "ts-morph";
import { Templates } from "../../templates.js";
import { createTypeImport, EndpointInterfaceGeneratorOptions, generateEndpointInterfacesAsText } from "./endpoint-interfaces.js";
import { pascalCase } from "pascal-case";
import { createTsMorphSrcFile, createTsMorphSrcFileFromText } from "../../ts-sources.js";

export interface EndpointDefinitionGeneratorOptions extends EndpointInterfaceGeneratorOptions {
  outDir: string;
  templatesDir?: string;
  apiNameSuffix?: string;
  generator: "zod" | "ts";
}

export async function generateEndpointDefinitions(openapiSpec: string, params: EndpointDefinitionGeneratorOptions) {
  appLog.childLog(generateEndpointDefinitions).info(`start generate:`, openapiSpec);
  const bundled = await bundleParseOpenapi(openapiSpec, { mergeAllOf: true, ensureDiscriminatorValues: true });
  return await generateEndpointDefinitionsFromBundled(bundled, params);
}

export async function generateEndpointDefinitionsFromBundled(bundled: OpenApiBundled, params: EndpointDefinitionGeneratorOptions) {
  const apiName = createApiName(bundled, { ...params, apiNameSuffix: params.apiNameSuffix ?? "Endpoints" });
  const endpoints = await generateEndpointInterfacesAsText(bundled, { ...params, apiName });

  const maybeTypeImport = createTypeImport(params);
  const withImports = [maybeTypeImport, "import {EndpointDefinition} from './EndpointDefinition.js'", endpoints].filter((i) => !_.isEmpty(i)).join("\n");

  const out = Folder.of(params?.outDir ?? "out").create();
  const { project } = await generateTemplates("EndpointDefinition.d.ts", { ...params, outDir: out.absolutePath });
  const endpointFileName = `${apiName}.ts`;
  const endpointFilePath = out.makeFile(endpointFileName).absolutePath;
  createTsMorphSrcFileFromText(endpointFilePath, withImports, project);
  await project.save();

  return { endpointFileName, endpointFilePath, sources: project.getSourceFiles().map((s) => s.getText()) };
}

export function createApiName(bundled: OpenApiBundled, params: EndpointDefinitionGeneratorOptions) {
  const rawApiName = params.apiName ?? bundled.info.title;
  const apiName = pascalCase(rawApiName);
  const name = _.isEmpty(apiName) ? "Api" : apiName;
  return `${name}${params.apiNameSuffix ?? ""}`;
}

async function generateTemplates(template: string, params: Pick<EndpointDefinitionGeneratorOptions, "outDir">, project: Project = new Project()) {
  const endpointTmpl = Templates.getTemplateFile(template, { distRoot: "client/endpoint", devRoot: "src/client/endpoint" });
  const source = createTsMorphSrcFile(endpointTmpl.absolutePath, project);
  const outFile = File.resolve(params.outDir, endpointTmpl.name);
  // copy
  const src = project.createSourceFile(outFile.absolutePath, source.sourceFile.getFullText(), { overwrite: true });

  return { project, sourceFile: src };
}
