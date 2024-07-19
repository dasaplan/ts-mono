/* eslint-disable @typescript-eslint/no-unused-vars */
import { appLog } from "./logger.js";
import { bundleParseOpenapi, Endpoint, OpenApiBundled, Transpiler } from "@dasaplan/openapi-bundler";
import { _, Folder } from "@dasaplan/ts-sdk";
import { Project } from "ts-morph";
import path from "node:path";
import { Templates } from "./templates.js";
import { EndpointDefinition } from "./EndpointDefinition.js";
import { object, string } from "zod";

export interface EndpointDefinitionOptions {
  outDir: string;
  templatesDir?: string;
}

// export function generateEndpointDefinitions(openapiSpec: string, out: string, _params?: EndpointDefinitionOptions) {
//   appLog.childLog(generateEndpointDefinitions).info(`start generate:`, openapiSpec, out);
//
//   const outDir = path.isAbsolute(out) ? out : path.resolve(process.cwd(), out);
//
//   const _apiFile = File.of(outDir, "endpoints.ts");
//
//   return outDir;
// }

function createEndpointDefinition(endpoint: Endpoint) {
  const parameters = {
    path: {},
    query: {},
    header: {},
    cookie: {},
  } satisfies EndpointDefinition.Parameters;

  const request = {
    format: undefined,
    payload: undefined,
    transform: undefined,
  } satisfies EndpointDefinition.Request;

  const response = {
    [200]: {
      format: undefined,
      payload: undefined,
      transform: undefined,
    },
  } satisfies EndpointDefinition.Response;

  type DeserializedResponse = EndpointDefinition.ToDeserializedResponse<typeof response>;
  type DeserializedRequest = EndpointDefinition.ToDeserializedRequest<typeof request>;

  return {
    // TODO: add guard to check for leading slash
    path: endpoint.path as EndpointDefinition.Path,
    name: endpoint.alias,
    operation: endpoint.method,
    parameters: parameters,
    response: response,
    request: request,
  } satisfies EndpointDefinition<DeserializedResponse, DeserializedRequest, typeof parameters>;
}

export async function generateEndpointDefinitionsInMemory(openapiSpec: string, _params?: EndpointDefinitionOptions) {
  appLog.childLog(generateEndpointDefinitionsInMemory).info(`start generate:`, openapiSpec);
  const bundled = await bundleParseOpenapi(openapiSpec, { mergeAllOf: true, ensureDiscriminatorValues: true });
  const endpoints = generateEndpointDefinitions(bundled);
  await generateTemplates(_params);
  return endpoints;
}

export async function generateEndpointDefinitions(bundled: OpenApiBundled, _params?: EndpointDefinitionOptions) {
  const endpoints = Transpiler.of(bundled).endpoints();

  return endpoints.map(createEndpointDefinition);
}

async function generateTemplates(_params?: EndpointDefinitionOptions) {
  const endpointTmpl = Templates.getTemplateFile("EndpointDefinition.d.ts");
  const out = Folder.of(_params?.outDir ?? "out");

  const source = createTsMorphSrcFile(endpointTmpl.absolutePath);
  source.sourceFile.copy(out.makeFile(endpointTmpl.name).absolutePath, { overwrite: true });
  await source.project.save();
  return out.absolutePath;
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
