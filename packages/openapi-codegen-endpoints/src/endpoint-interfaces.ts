/* eslint-disable @typescript-eslint/no-unused-vars */
import { Endpoint, OpenApiBundled, Schema, Transpiler } from "@dasaplan/openapi-bundler";
import { _, ApplicationError } from "@dasaplan/ts-sdk";

import { pascalCase } from "pascal-case";

import { EndpointDefinition } from "./endpoint-definition.js";

export interface EndpointInterfaceGeneratorOptions {
  tsImportModuleName?: string;
  typeSuffix?: string;
  apiName?: string;
}

type GroupedParams = { [param in Endpoint.Parameter["type"]]: Array<Endpoint.Parameter & { type: param }> };

export async function generateEndpointInterfacesAsText(bundled: OpenApiBundled, params: EndpointInterfaceGeneratorOptions) {
  try {
    const endpoints = Transpiler.of(bundled).endpoints();

    function toObjectMap(obj: object): string {
      return `{${Object.entries(obj)
        .map(([key, val]) => `"${key}": ${typeof val === "object" ? toObjectMap(val) : val}`)
        .join(",")}}`;
    }

    const interfaces = endpoints.map((e) => {
      const { path, name, request, parameters, response, operation } = generateEndpointInterface(e, params);
      const schemas = [...Object.values(response), request]
        .filter(_.isDefined)
        .map((t) => `${t} extends EndpointDefinition.DtoTypes`)
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
    });
    return `export module ${params.apiName} {
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

function generateEndpointInterface<T extends Endpoint = Endpoint>(endpoint: T, params: EndpointInterfaceGeneratorOptions) {
  const groupedParams = _.groupBy(endpoint.parameters ?? [], (it) => it.type) as GroupedParams;
  const parameters = {
    path: groupedParams?.["path"]?.reduce((acc, curr) => ({ [curr.name]: generatePayloadType(curr.schema, params) }), {}),
    query: groupedParams?.["query"]?.reduce((acc, curr) => ({ [curr.name]: generatePayloadType(curr.schema, params) }), {}),
    header: groupedParams?.["header"]?.reduce((acc, curr) => ({ [curr.name]: generatePayloadType(curr.schema, params) }), {}),
    cookie: groupedParams?.["cookie"]?.reduce((acc, curr) => ({ [curr.name]: generatePayloadType(curr.schema, params) }), {}),
  } satisfies EndpointDefinition.Parameters;

  const request = generatePayloadType(endpoint?.requestBody?.schema, params);

  const response: EndpointDefinition.Response = endpoint.responses
    .filter((r) => _.isDefined(r.status))
    .reduce(
      (acc, curr) => ({
        [curr.status!]: generatePayloadType(curr.schema, params),
      }),
      {}
    ) satisfies EndpointDefinition.Response;

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
  if (params.tsImportModuleName) {
    return `${params.tsImportModuleName}.${identifier}`;
  }
  return identifier;
}

function generatePayloadType(schema: Schema | undefined, params: EndpointInterfaceGeneratorOptions) {
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