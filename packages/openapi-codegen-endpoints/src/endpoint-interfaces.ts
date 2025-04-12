/* eslint-disable @typescript-eslint/no-unused-vars */
import { Endpoint, OpenApiBundled, Schema, Transpiler } from "@dasaplan/openapi-bundler";
import { _, ApplicationError } from "@dasaplan/ts-sdk";

import { pascalCase } from "pascal-case";

import { EndpointDefinition } from "./endpoint-definition.js";
import { EndpointDefinitionGeneratorOptions } from "./endpoint-generator.js";

export interface EndpointInterfaceGeneratorOptions {
  /** import * as <namespace> from 'moduleName' */
  tsApiTypesModule?: { namespace: string; moduleName: string; kind: "IMPORT_AND_NAMESPACE" } | { namespace: string; kind: "NAMESPACE_WITHOUT_IMPORT" };
  typeSuffix?: string;
  apiName?: string;
}

type GroupedParams = { [param in Endpoint.Parameter["type"]]: Array<Endpoint.Parameter & { type: param }> };

export function toObjectMap(obj: object): string {
  return `{${Object.entries(obj)
    .map(([key, val]) => `"${key}": ${typeof val === "object" ? toObjectMap(val) : val}`)
    .join(",")}}`;
}

export function createTypeImport(params: EndpointDefinitionGeneratorOptions) {
  return params.tsApiTypesModule?.kind === "IMPORT_AND_NAMESPACE"
    ? `import * as ${params.tsApiTypesModule.namespace} from '${params.tsApiTypesModule.moduleName}'`
    : "";
}
function generateEndpointWithGenericTypes(e: Endpoint, params: EndpointInterfaceGeneratorOptions) {
  const { path, name, request, parameters, response, operation } = generateEndpointInterface(e, params);
  const schemas = [...Object.values(response), request]
    .filter(_.isDefined)
    .map((t) => `${t.replace("[]", "")} extends EndpointDefinition.DtoTypes`)
    .join(", ");
  return `export interface ${pascalCase(name)}<${schemas}> extends EndpointDefinition<
                ${toObjectMap(response)},
                ${request},
                ${toObjectMap(parameters)}
            > {
        name: "${name}";
        operation: "${operation}";
        path: "${path}"
    }
    `;
}

function generateEndpointWithTypes(e: Endpoint, params: EndpointInterfaceGeneratorOptions) {
  const { path, name, request, parameters, response, operation } = generateEndpointInterface(e, params);

  return `export interface ${pascalCase(name)} extends EndpointDefinition<
                ${toObjectMap(response)},
                ${request},
                ${toObjectMap(parameters)}
            > {
        name: "${name}";
        operation: "${operation}";
        path: "${path}"
    }
    `;
}
export async function generateEndpointInterfacesAsText(bundled: OpenApiBundled, params: EndpointInterfaceGeneratorOptions) {
  try {
    const endpoints = Transpiler.of(bundled).endpoints();

    const interfaceGenerator = (e: Endpoint) =>
      _.isDefined(params.tsApiTypesModule) ? generateEndpointWithTypes(e, params) : generateEndpointWithGenericTypes(e, params);

    const interfaces = endpoints.map(interfaceGenerator);
    return `export namespace ${params.apiName} {
                export type Path = ${_.uniq(endpoints.map((e) => `"${e.path}"`)).join(" | ")}
                export interface OperationToPath {
                    ${endpoints.map((e) => `${e.alias}: "${e.path}";`).join("\n")}
                }
                ${interfaces.join("\n")}
            }`.trim();
  } catch (error) {
    throw ApplicationError.create("Failed generating endpoint interfaces").chainUnknown(error);
  }
}

export function generateEndpointInterface<T extends Endpoint = Endpoint>(endpoint: T, params: EndpointInterfaceGeneratorOptions) {
  const groupedParams = _.groupBy(endpoint.parameters ?? [], (it) => it.type) as GroupedParams;
  const parameters = {
    path: groupedParams?.["path"]?.reduce((acc, curr) => ({ [curr.name]: generatePayloadType(curr.schema, params) }), {}),
    query: groupedParams?.["query"]?.reduce((acc, curr) => ({ [curr.name]: generatePayloadType(curr.schema, params) }), {}),
    header: groupedParams?.["header"]?.reduce((acc, curr) => ({ [curr.name]: generatePayloadType(curr.schema, params) }), {}),
    cookie: groupedParams?.["cookie"]?.reduce((acc, curr) => ({ [curr.name]: generatePayloadType(curr.schema, params) }), {}),
  } satisfies EndpointDefinition.Parameters;

  const request = generatePayloadType(endpoint?.requestBody?.schema, params);

  const response: Record<number, string> = endpoint.responses
    .filter((r) => _.isDefined(r.status))
    .reduce(
      (acc, curr) => ({
        [curr.status!]: generatePayloadType(curr.schema, params),
      }),
      {},
    );

  return {
    path: endpoint.path as EndpointDefinition.Path,
    name: endpoint.alias,
    operation: endpoint.method,
    parameters: parameters,
    response: response,
    request: request,
  };
}

function createIdentifier(schema: Schema, params: EndpointInterfaceGeneratorOptions) {
  const identifier = [schema.getName(), params.typeSuffix].filter(_.isDefined).join("");
  if (params.tsApiTypesModule) {
    return `${params.tsApiTypesModule.namespace}.${identifier}`;
  }
  return identifier;
}

function generatePayloadType(schema: Schema | undefined, params: EndpointInterfaceGeneratorOptions): string | undefined {
  if (_.isNil(schema)) return undefined;
  switch (schema.kind) {
    case "PRIMITIVE": {
      return `${schema.type === "integer" ? "number" : schema.type}`;
    }
    case "OBJECT":
    case "UNION": {
      switch (schema.component.kind) {
        case "COMPONENT":
          return createIdentifier(schema, params);
        case "INLINE":
          throw ApplicationError.create(
            `Failed to generate parameter schema: '${schema.getName()}':
             Inline schema are yet not supported. Please define a schema and reference it (#/components/schema/<Name>)`,
          );
      }
      break;
    }
    case "ARRAY": {
      return `${generatePayloadType(schema.items, params)}[]`;
    }
    case "ENUM":
    case "BOX":
      throw ApplicationError.create(
        `Failed to generate parameter schema '${schema.getName()}':
            non-primitive parameters schema are yet not supported.
            Please define the payload as schema and reference it (#/components/schema/<Name>)`,
      );
  }
}
