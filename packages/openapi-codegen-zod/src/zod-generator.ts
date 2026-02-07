import { File } from "@dasaplan/ts-sdk";

import {
  createConstantDeclaration,
  createModule,
  createParametersDeclaration,
  createRequestDeclaration,
  createResponsesDeclaration,
  createTypeDeclaration,
  createUnionDeclaration,
  IDENTIFIER_API,
  ZodGenOptions,
} from "./zod-schemas.js";
import { Endpoint, OpenApiBundled, Schema, Transpiler } from "@dasaplan/openapi-bundler";
import { appLog } from "./logger.js";
import { getZodCommon } from "./zod-common.js";
import { Project, ScriptKind, ts } from "ts-morph";

/** Generate zod schemas and export to filesystem */
export async function generateZodSchemas(openapiSpec: OpenApiBundled, outFile: string, options?: ZodGenOptions) {
  appLog.childLog(generateZodSchemas).info(`start generate: %s`, outFile);
  const outFilePath = File.of(outFile).absolutePath;
  const { project } = await generateZodSources(openapiSpec, File.resolve(outFile).absolutePath, options);
  project.saveSync();
  return outFilePath;
}

/** Generate zod schemas and export to filesystem and keep a handle to the sources */
export async function generateZodSources(parsed: OpenApiBundled, filePath: string, params?: ZodGenOptions) {
  const options: ZodGenOptions = {
    includeTsTypes: true,
    withUnknownEnum: true,
    withUnknownUnion: true,
    lowerCaseHeader: true,
    withValueOptional: true,
    tsTypeNameSuffix: "",
    ...(params ?? {}),
  };
  const transpiler = Transpiler.of(parsed);
  const schemas = transpiler.schemasTopoSorted();
  const endpoints = transpiler.endpoints();

  const { imports, schemasModule } = generateZodSchemasFromParseModel(schemas, endpoints, options);

  const source = [...imports, schemasModule].join("\n");
  const sourceSchema = createTsMorphSrcFile(filePath, source);

  const commonFilePath = File.of(filePath).siblingFile("zod-common.ts").absolutePath;
  createTsMorphSrcFile(commonFilePath, getZodCommon(), sourceSchema.project);
  return sourceSchema;
}

export function generateEndpointSchemasFromParseModel(endpoints: Array<Endpoint>, options: ZodGenOptions) {
  const operations = endpoints.map((e) => {
    return `"${e.alias}": {
     path: "${e.path}",
     method: "${e.method}",
     params: ${createParametersDeclaration(e.parameters, options)},
     responses: ${createResponsesDeclaration(e.responses, options)},
     request: ${createRequestDeclaration(e.requestBody, options)}
    }`;
  });
  return `export const Endpoints = { ${operations.join(",\n")}} as const`;
}

/** Generate zod schemas In-Memory from the parse model */
export function generateZodSchemasFromParseModel(schemas: Array<Schema>, endpoints: Array<Endpoint>, options: ZodGenOptions) {
  const components = schemas.filter((s) => s.component.kind === "COMPONENT");
  // we want to generate all components
  const imports = ["import { z } from 'zod'", "import * as zc from './zod-common.js'"];
  if (options.includeTsTypes) {
    imports.push(`import * as ${IDENTIFIER_API} from './api.js'`);
  }

  const schemaDeclarations = components.map((c) => createConstantDeclaration(c, options));

  // include types
  const typeDeclarations = components.map((c) => createTypeDeclaration(c, options));
  const schemaTypesModule = createModule("Types", typeDeclarations, options);
  schemaDeclarations.push(schemaTypesModule);

  // include unions which can used for introspecting e.g. for test data generators
  // ignore if we have less than 2 "unique" schemas - (we can omit mappings, because discriminator values are handled in the schema)
  const unions = components.filter((c) => c.kind === "UNION" && c.schemas.length > 1);
  if (unions.length > 0) {
    const unionDeclarations = unions.map((c) => createUnionDeclaration(c, options));
    const unionModule = createModule("Unions", unionDeclarations, options);
    schemaDeclarations.push(unionModule);
  }

  // include operations from api with params
  const operations = generateEndpointSchemasFromParseModel(endpoints, options);
  schemaDeclarations.push(operations);

  const schemasModule = createModule("Schemas", schemaDeclarations, options);

  return { imports, schemasModule, schemaDeclarations, typeDeclarations, schemaTypesModule };
}

function createTsMorphSrcFile(tsFilePath: string, source: string, project: Project = new Project()) {
  const sourceFile = project.createSourceFile(tsFilePath, source, {
    overwrite: true,
    scriptKind: ScriptKind.TS,
  });
  sourceFile.formatText({
    indentSwitchCase: true,
    indentStyle: ts.IndentStyle.Smart,
    indentMultiLineObjectLiteralBeginningOnBlankLine: true,
  });
  sourceFile.saveSync();
  return { project, sourceFile: sourceFile };
}
