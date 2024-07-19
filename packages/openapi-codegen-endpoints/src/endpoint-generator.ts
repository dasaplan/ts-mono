/* eslint-disable @typescript-eslint/no-unused-vars */
import { appLog } from "./logger.js";
import { bundleParseOpenapi, Endpoint, OpenApiBundled, Schema, Transpiler } from "@dasaplan/openapi-bundler";
import { _, ApplicationError, Folder } from "@dasaplan/ts-sdk";
import { Project } from "ts-morph";
import path from "node:path";
import { Templates } from "./templates.js";
import { EndpointDefinition } from "./endpoint-definition.js";

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

function generatePayloadSchema(schema: Schema | undefined) {
  if (_.isNil(schema)) return undefined;

  switch (schema.component.kind) {
    case "COMPONENT":
      return { $ref: schema.component.id };
    case "INLINE":
      throw ApplicationError.create(
        `Failed to generate payload type for schema '${schema.getId()}':
            Inline schemas are yet not supported for request / response payloads.
            Please define the payload as schema and reference it (#/components/schema/<Name>)   `
      );
  }
}

function generateParamsSchema(schema: Schema | undefined) {
  if (_.isNil(schema)) return undefined;

  switch (schema.component.kind) {
    case "COMPONENT":
      return { $ref: schema.component.id };
    case "INLINE":
      switch (schema.kind) {
        case "PRIMITIVE":
          return { type: schema.type };
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

function createEndpointDefinition<T extends Endpoint = Endpoint>(endpoint: T) {
  type GroupedParams = { [param in Endpoint.Parameter["type"]]: Array<Endpoint.Parameter & { type: param }> };
  const groupedParams = _.groupBy(endpoint.parameters ?? [], (it) => it.type) as GroupedParams;
  const parameters = {
    path: groupedParams?.["path"]?.reduce((acc, curr) => ({ [curr.name]: generateParamsSchema(curr.schema) }), {}),
    query: groupedParams?.["query"]?.reduce((acc, curr) => ({ [curr.name]: generateParamsSchema(curr.schema) }), {}),
    header: groupedParams?.["header"]?.reduce((acc, curr) => ({ [curr.name]: generateParamsSchema(curr.schema) }), {}),
    cookie: groupedParams?.["cookie"]?.reduce((acc, curr) => ({ [curr.name]: generateParamsSchema(curr.schema) }), {}),
  } satisfies EndpointDefinition.Parameters;

  const request = {
    format: endpoint.requestBody?.format,
    payload: generatePayloadSchema(endpoint?.requestBody?.schema),
    transform: undefined,
  } satisfies EndpointDefinition.Request;

  const response: EndpointDefinition.Response = endpoint.responses
    .filter((r) => _.isDefined(r.status))
    .reduce(
      (acc, curr) => ({
        [curr.status!]: {
          format: curr.format,
          payload: generatePayloadSchema(curr.schema),
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
