import { appLog } from "./logger.js";
import { bundleParseOpenapi, OpenApiBundled } from "@dasaplan/openapi-bundler";
import { _, Folder, File } from "@dasaplan/ts-sdk";
import { Project } from "ts-morph";
import { Templates } from "../../templates.js";
import { pascalCase } from "pascal-case";
import { createTsMorphSrcFile, createTsMorphSrcFileFromText } from "../../ts-sources.js";
import { ExpressServerZodApiOption, generateExpressZodApiFromBundledAsText } from "../../server/express/express-server-zod-api.js";
import { generateExpressTsApiFromBundledAsText } from "../../server/express/express-server-ts-api.js";
import { generateZodSources } from "../../marshalling/zod/zod-generator.js";
import { EndpointDefinitionGeneratorOptions } from "../../client/endpoint/index.js";

export interface ExpressApiGeneratorOptions extends ExpressServerZodApiOption {
  outDir: string;
  templatesDir?: string;
}

export async function generateExpressApi(openapiSpec: string, params: ExpressApiGeneratorOptions) {
  appLog.childLog(generateExpressApi).info(`start generate:`, openapiSpec);
  const bundled = await bundleParseOpenapi(openapiSpec, { mergeAllOf: true, ensureDiscriminatorValues: true });

  if (params.generator === "ts") {
    return await generateExpressTsApiFromBundled(bundled, params);
  }
  return await generateExpressZodApiFromBundled(bundled, params);
}

export async function generateExpressZodApiFromBundled(bundled: OpenApiBundled, params: ExpressApiGeneratorOptions) {
  const apiName = createApiName(bundled, { ...params, apiNameSuffix: "ExpressJs" });
  const endpoints = await generateExpressZodApiFromBundledAsText(bundled, { ...params, apiName });

  const out = Folder.of(params?.outDir ?? "out").create();

  const zodSchemasFilePath = out.makeFile("zod.ts").absolutePath;
  const { project } = await generateZodSources(bundled, zodSchemasFilePath, {
    includeTsTypes: false,
    withUnknownEnum: false,
    withUnknownUnion: false,
    lowerCaseHeader: true,
    withValueOptional: true,
    tsTypeNameSuffix: "",
  });

  await generateTemplates("ExpressZodCommon.ts", { ...params, outDir: out.absolutePath }, project);
  await generateTemplates("ExpressCommon.ts", { ...params, outDir: out.absolutePath }, project);
  // TODO FIX IMPORTS FROM EXPRESS.js - project.save seems to rewrite the sources
  const endpointFileName = `${apiName}.ts`;
  const endpointFilePath = out.makeFile(endpointFileName).absolutePath;

  const indexFileTemplate = `
    export {ResponseValidationError, RequestValidationError, MissingResponseSchemaError } from "./ExpressZodCommon.js"
    export type { ExpressHandler, ControllerResult, ControllerFn } from "./ExpressCommon.js"
    export * from './zod.js'
    export * from './${apiName}.js'
  `;

  const indexFile = out.makeFile("index.ts").absolutePath;
  createTsMorphSrcFileFromText(indexFile, indexFileTemplate, project);
  createTsMorphSrcFileFromText(endpointFilePath, endpoints, project);
  await project.save();

  return { endpointFileName, endpointFilePath, sources: project.getSourceFiles().map((s) => s.getText()) };
}

export async function generateExpressTsApiFromBundled(bundled: OpenApiBundled, params: ExpressApiGeneratorOptions) {
  const apiName = createApiName(bundled, { ...params, apiNameSuffix: "ExpressJs" });
  const endpoints = await generateExpressTsApiFromBundledAsText(bundled, { ...params, apiName });

  const out = Folder.of(params?.outDir ?? "out").create();
  const { project } = await generateTemplates("ExpressCommon.ts", { ...params, outDir: out.absolutePath });
  await generateTemplates("ExpressTsCommon.ts", { ...params, outDir: out.absolutePath }, project);

  const endpointFileName = `${apiName}.ts`;
  const endpointFilePath = out.makeFile(endpointFileName).absolutePath;
  createTsMorphSrcFileFromText(endpointFilePath, endpoints, project);
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
  const endpointTmpl = Templates.getTemplateFile(template, { devRoot: "src/server/express", distRoot: "server/express" });
  const source = createTsMorphSrcFile(endpointTmpl.absolutePath, project);
  const outFile = File.resolve(params.outDir, endpointTmpl.name);
  // copy
  const src = project.createSourceFile(outFile.absolutePath, source.sourceFile.getFullText(), { overwrite: true });

  return { project, sourceFile: src };
}
