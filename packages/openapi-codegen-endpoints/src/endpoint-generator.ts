/* eslint-disable @typescript-eslint/no-unused-vars */
import { appLog } from "./logger.js";
import { bundleParseOpenapi, Endpoint, OpenApiBundled, Schema, Transpiler } from "@dasaplan/openapi-bundler";
import { _, ApplicationError, Folder } from "@dasaplan/ts-sdk";
import { Project, ScriptKind, ts } from "ts-morph";
import path from "node:path";
import { Templates } from "./templates.js";
import { EndpointDefinition } from "./endpoint-definition.js";

export interface EndpointDefinitionOptions extends EndpointGeneratorOptions {
  outDir: string;
  templatesDir?: string;
}
export interface EndpointGeneratorOptions {
  tsImportModuleName?: string;
  typeSuffix?: string;
}

function generatePayloadSchema(schema: Schema | undefined, params: EndpointGeneratorOptions) {
  if (_.isNil(schema)) return undefined;

  switch (schema.component.kind) {
    case "COMPONENT":
      return createIdentifier(schema, params);
    case "INLINE":
      throw ApplicationError.create(
        `Failed to generate payload type for schema '${schema.getId()}':
            Inline schemas are yet not supported for request / response payloads.
            Please define the payload as schema and reference it (#/components/schema/<Name>)   `
      );
  }
}

function createIdentifier(schema: Schema, params: EndpointGeneratorOptions) {
  const identifier = `${schema.getName()}${params.typeSuffix}`;
  if (params.tsImportModuleName) {
    return `${params.tsImportModuleName}.${identifier}`;
  }
  return identifier;
}

function generateParamsSchema(schema: Schema | undefined, params: EndpointGeneratorOptions) {
  if (_.isNil(schema)) return undefined;

  switch (schema.component.kind) {
    case "COMPONENT":
      return createIdentifier(schema, params);
    case "INLINE":
      switch (schema.kind) {
        case "PRIMITIVE":
          return `${schema.type === "integer" ? "number" : schema.type}`;
        case "OBJECT":
        case "UNION":
        case "ENUM":
        case "ARRAY":
        case "BOX":
          throw ApplicationError.create(
            `Failed to generate parameter schema '${schema.getName()}':
            non-primitive parameters schema are yet not supported.
            Please define the payload as schema and reference it (#/components/schema/<Name>)`
          );
      }
  }
}

function createEndpointDefinition<T extends Endpoint = Endpoint>(endpoint: T, params: EndpointGeneratorOptions) {
  type GroupedParams = { [param in Endpoint.Parameter["type"]]: Array<Endpoint.Parameter & { type: param }> };
  const groupedParams = _.groupBy(endpoint.parameters ?? [], (it) => it.type) as GroupedParams;
  const parameters = {
    path: groupedParams?.["path"]?.reduce((acc, curr) => ({ [curr.name]: generateParamsSchema(curr.schema, params) }), {}),
    query: groupedParams?.["query"]?.reduce((acc, curr) => ({ [curr.name]: generateParamsSchema(curr.schema, params) }), {}),
    header: groupedParams?.["header"]?.reduce((acc, curr) => ({ [curr.name]: generateParamsSchema(curr.schema, params) }), {}),
    cookie: groupedParams?.["cookie"]?.reduce((acc, curr) => ({ [curr.name]: generateParamsSchema(curr.schema, params) }), {}),
  } satisfies EndpointDefinition.Parameters;

  const request = {
    format: endpoint.requestBody?.format,
    payload: generatePayloadSchema(endpoint?.requestBody?.schema, params),
    transform: undefined,
  } satisfies EndpointDefinition.Request;

  const response: EndpointDefinition.Response = endpoint.responses
    .filter((r) => _.isDefined(r.status))
    .reduce(
      (acc, curr) => ({
        [curr.status!]: {
          format: curr.format,
          payload: generatePayloadSchema(curr.schema, params),
          transform: undefined,
        },
      }),
      {}
    ) satisfies EndpointDefinition.Response;

  type DeserializedResponse = EndpointDefinition.ToDeserializedResponse<typeof response>;
  type DeserializedRequest = EndpointDefinition.ToDeserializedRequest<typeof request>;

  return {
    path: endpoint.path as EndpointDefinition.Path,
    name: endpoint.alias,
    operation: endpoint.method,
    parameters: parameters,
    response: response,
    request: request,
  } satisfies EndpointDefinition<DeserializedResponse, DeserializedRequest, typeof parameters>;
}

export async function generateEndpointDefinitionsInMemory(openapiSpec: string, params: EndpointDefinitionOptions) {
  appLog.childLog(generateEndpointDefinitionsInMemory).info(`start generate:`, openapiSpec);
  const bundled = await bundleParseOpenapi(openapiSpec, { mergeAllOf: true, ensureDiscriminatorValues: true });
  const endpoints = await generateEndpointDefinitions(bundled, params);

  const out = Folder.of(params?.outDir ?? "out");
  const endpointSourceText = `
  const endpoints = ${JSON.stringify(endpoints, undefined, 2)} as const
  `;
  const { project } = createTsMorphSrcFileFromText(out.makeFile("endpoints.ts").absolutePath, endpointSourceText);
  await generateTemplates(params, project);
  await project.save();

  return endpoints;
}

export async function generateEndpointDefinitions(bundled: OpenApiBundled, params: EndpointGeneratorOptions = {}) {
  const endpoints = Transpiler.of(bundled).endpoints();
  const endpointDefinitions = endpoints.map((e) => createEndpointDefinition(e, params));
  const groupedByName = _.groupBy(endpointDefinitions, (it) => it.name);
  return Object.entries(groupedByName).reduce((acc, [key, values]) => ({ ...acc, [key]: values.at(0) }), {});
}

async function generateTemplates(_params?: EndpointDefinitionOptions, project: Project = new Project()) {
  const endpointTmpl = Templates.getTemplateFile("EndpointDefinition.d.ts");
  const out = Folder.of(_params?.outDir ?? "out");

  const source = createTsMorphSrcFile(endpointTmpl.absolutePath, project);
  source.sourceFile.copy(out.makeFile(endpointTmpl.name).absolutePath, { overwrite: true });
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
