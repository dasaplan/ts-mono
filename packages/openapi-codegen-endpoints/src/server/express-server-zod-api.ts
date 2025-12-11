import { Endpoint, OpenApiBundled, Transpiler } from "@dasaplan/openapi-bundler";
import { ApplicationError } from "@dasaplan/ts-sdk";
import {
  createImport,
  createTsConstObject,
  createTsExtendedInterface,
  createTsFnParam,
  createTsInlineObject,
  createTsInterface,
  createTsNestedInlineObject,
  createTsObjectProperty,
  createTypedTsConstObject,
  createTypeObjectProperty,
} from "./template-factory.js";

export interface ExpressServerZodApiOption {
  apiName: string;
  generator: "zod" | "ts";
}
export async function generateExpressZodApiFromBundledAsText(bundled: OpenApiBundled, params: ExpressServerZodApiOption) {
  try {
    const endpoints = Transpiler.of(bundled).endpoints();

    return generateCreateExpressServerApi(endpoints, params);
  } catch (error) {
    throw ApplicationError.create("Failed generating express api").chainUnknown(error);
  }
}

export function generateCreateExpressServerApi(endpoints: Array<Endpoint>, options: ExpressServerZodApiOption) {
  /* -------------------------------------- */
  /* ----------Import Declarations--------- */
  /* -------------------------------------- */

  const importSchemas = createImport("./zod.js", "Schemas");
  const importExpress = createImport("express", "Express");
  const importExpressZod = createImport("./ExpressZodCommon.js", "ApiConfig", "Operation", "CreateInputValidator", "CreateController", "withDefaults");
  const libImports = [importSchemas, importExpress, importExpressZod].join("\n");

  /* -------------------------------------- */
  /* -------Interface Declarations -------- */
  /* -------------------------------------- */

  const typeOperationsProps = endpoints.map((e) => {
    const endpointSchemas = `TEndpoints["${e.alias}"]`;

    const responsesMap = `${endpointSchemas}["responses"]`;
    const requestBody = `${endpointSchemas}["request"]`;
    const pathParams = `${endpointSchemas}["params"]["path"]`;
    const queryParams = `${endpointSchemas}["params"]["query"]`;
    const headers = `${endpointSchemas}["params"]["header"]`;

    return createTypeObjectProperty(e.alias, `Operation<${responsesMap}, ${requestBody}, ${pathParams}, ${queryParams}, ${headers}>`);
  });
  const interfaceOperationMap = createTsInterface(`${options.apiName}Operations`, ...typeOperationsProps);

  const typeOperationsProperty = createTypeObjectProperty("operations", interfaceOperationMap.name);
  const interfaceApiConfig = createTsExtendedInterface(`${options.apiName}ApiConfig`, [typeOperationsProperty], {
    extends: `${importExpressZod.imports.ApiConfig}<${interfaceOperationMap.name}>`,
  });

  /* -------------------------------------- */
  /* -------Const Declarations -------- */
  /* -------------------------------------- */

  const generatorOperations = endpoints.map((e) => {
    const requestValidation = createTsInlineObject(
      "requestValidation",
      createTsObjectProperty("headers", `Schemas.Endpoints.${e.alias}.params.header`),
      createTsObjectProperty("query", `Schemas.Endpoints.${e.alias}.params.query`),
      createTsObjectProperty("params", `Schemas.Endpoints.${e.alias}.params.path`),
      createTsObjectProperty("body", `Schemas.Endpoints.${e.alias}.request`),
    );

    const responseValidation = createTsInlineObject("responseValidation", createTsObjectProperty("responses", `Schemas.Endpoints.${e.alias}.responses`));
    return createTsNestedInlineObject(e.alias, requestValidation, responseValidation);
  });

  const generatorDefaultConfigDeclaration = createTypedTsConstObject(
    { name: "GeneratorDefaultConfig", type: "Record<string, Pick<Operation, 'requestValidation' | 'responseValidation'>>" },
    ...generatorOperations,
  );

  /* -------------------------------------- */
  /* -------Function Declarations -------- */
  /* -------------------------------------- */

  const paramApiConfig = createTsFnParam("apiConfig", interfaceApiConfig.name);
  const apiName = options.apiName.includes("Api") ? options.apiName : `${options.apiName}Api`;
  const createEndpoints = `export function create${apiName}(app: Express, ${paramApiConfig}){
    ${endpoints
      .map((e) => {
        const params: Array<Endpoint.Parameter> = e.parameters ?? [];
        const pathParmKeys = params.filter((p) => p.type === "path").map((p) => p.name);
        const expressPath = pathParmKeys.reduce((acc, param) => acc.replaceAll(`{${param}}`, `:${param.trim()}`), e.path);
        ApplicationError.assert(
          !expressPath.includes("{"),
          `Expected path ${expressPath} to be convertable to express path param syntax: segment/{param1} => segment/:param1. 
          Ensure all parameters are defined and well formed openapi syntax for the operation ${e.alias}`,
        );

        const op = `${paramApiConfig.name}.${typeOperationsProperty.name}["${e.alias}"]` as const;
        const defaults = `${paramApiConfig.name}.defaults` as const;

        const idWithDefaults = `withDefaults_${e.alias}`;
        const opGeneratorConfig = `${generatorDefaultConfigDeclaration.name}["${e.alias}"]`;
        const withDefaults = `const ${idWithDefaults} = withDefaults("${e.alias}", ${op}, ${defaults}, ${opGeneratorConfig} )`;

        // Generate with zod dependencies
        const zodInputSchemas = `{ 
          headers: ${idWithDefaults}?.requestValidation?.headers, 
          params:  ${idWithDefaults}?.requestValidation?.params,
          body:  ${idWithDefaults}?.requestValidation?.body 
        }`;
        const CreateInputValidator = `CreateInputValidator(${zodInputSchemas})`;

        // TODO: include response schemas from zod - we need to think how we like to wire in the zod generator
        const responseValidator = `${idWithDefaults}?.responseValidation?.responses`;

        return `
        ${withDefaults};
        app.router["${e.method}"](
          "${expressPath}",
          ...(${idWithDefaults}?.requestMiddlewares ?? []), 
          ${CreateInputValidator},
          CreateController(${idWithDefaults}.controller as never, ${responseValidator}),
          ...(${idWithDefaults}?.responseMiddlewares ?? [])
        );
      `;
      })
      .join("\n")}
  }`;

  return ` 
  ${libImports}
  
  type TEndpoints = typeof Schemas.Endpoints;

  /** Schema validation from the OpenApi specification. Can be overwritten using ApiConfig. */
  ${generatorDefaultConfigDeclaration}
  /** All typed operations from OpenApi specification. Operation names are taken from operationId. */
  ${interfaceOperationMap}
  ${interfaceApiConfig}
  /**
   * Main function to register all express routes from OpenApi specification. 
   * ApiConfig needs to be implemented. By default request and response validation is generated.
   * To opt-out from default request or schema validation, respective defaults can be set to false 
   * on scopedGlobalConfig or operation level.
   */
  ${createEndpoints}
  `;
}
