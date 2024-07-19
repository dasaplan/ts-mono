/* eslint-disable @typescript-eslint/no-unused-vars */
import { appLog } from "../../logger.js";
import { bundleParseOpenapi, Endpoint, OpenApiBundled, Transpiler } from "@dasaplan/openapi-bundler";
import { Project } from "ts-morph";
import path from "node:path";

export interface EndpointDefinitionOptions {}

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
  return `
    
    `;
}

export async function generateEndpointDefinitionsInMemory(openapiSpec: string, _params?: EndpointDefinitionOptions) {
  appLog.childLog(generateEndpointDefinitionsInMemory).info(`start generate:`, openapiSpec);
  const bundled = await bundleParseOpenapi(openapiSpec, { mergeAllOf: true, ensureDiscriminatorValues: true });
  return generateEndpointDefinitions(bundled);
}
export async function generateEndpointDefinitions(bundled: OpenApiBundled, _params?: EndpointDefinitionOptions) {
  const endpoints = Transpiler.of(bundled).endpoints();
  const common = JSON.stringify();
  return endpoints.map(createEndpointDefinition);
}

function createTsMorphSrcFile(tsFilePath: string) {
  const project = new Project();
  project.createSourceFile(tsFilePath, "");
  const sourceFile = project.getSourceFile(path.basename(tsFilePath));
  if (_.isNil(sourceFile)) {
    throw `Error: Expected source file for provided path: srcFile: ${tsFilePath}`;
  }
  return { project, sourceFile: sourceFile };
}
