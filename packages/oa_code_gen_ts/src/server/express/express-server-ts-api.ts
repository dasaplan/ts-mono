import { Endpoint, OpenApiBundled, Transpiler } from "@dasaplan/openapi-bundler";
import { ApplicationError } from "@dasaplan/ts-sdk";
import { createImport, createTsExtendedInterface, createTsFnParam, createTsInterface, createTypeObjectProperty } from "./template-factory.js";

export interface ExpressServerApiOption {
  apiName: string;
  generator: "zod" | "ts";
}
export async function generateExpressTsApiFromBundledAsText(bundled: OpenApiBundled, params: ExpressServerApiOption) {
  try {
    const endpoints = Transpiler.of(bundled).endpoints();

    return generateCreateExpressServerApi(endpoints, params);
  } catch (error) {
    throw ApplicationError.create("Failed generating express api").chainUnknown(error);
  }
}

export function generateCreateExpressServerApi(endpoints: Array<Endpoint>, options: ExpressServerApiOption) {
  /* -------------------------------------- */
  /* ----------Import Declarations--------- */
  /* -------------------------------------- */

  const importExpress = createImport("express", "Express");
  const importExpressZod = createImport("./ExpressZodCommon.js", "ApiConfig", "Operation", "CreateInputValidator", "CreateController", "withDefaults");
  const importExpressTs = createImport("./ExpressTsCommon.js", ...Object.values(importExpressZod.imports));
  const expressGenLib = options.generator === "zod" ? importExpressZod : importExpressTs;
  const libImports = [importExpress, expressGenLib].join("\n");

  /* -------------------------------------- */
  /* -------Interface Declarations -------- */
  /* -------------------------------------- */

  const typeOperationsProps = endpoints.map((e) => createTypeObjectProperty(e.alias, "Operation"));
  const interfaceOperationMap = createTsInterface(`${options.apiName}Operations`, ...typeOperationsProps);

  const typeOperationsProperty = createTypeObjectProperty("operations", interfaceOperationMap.name);
  const interfaceApiConfig = createTsExtendedInterface(`${options.apiName}ApiConfig`, [typeOperationsProperty], {
    extends: `${expressGenLib.imports.ApiConfig}<${interfaceOperationMap.name}>`,
  });

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
        const withDefaults = `const ${idWithDefaults} = withDefaults("${e.alias}", ${op}, ${defaults} )`;

        return `
        ${withDefaults};
        app.router["${e.method}"](
          "${expressPath}",
          ...(${idWithDefaults}?.requestMiddlewares ?? []), 
          CreateInputValidator(${idWithDefaults}?.requestValidation),
          CreateController(${idWithDefaults}.controller, ${idWithDefaults}?.responseValidation),
          ...(${idWithDefaults}?.responseMiddlewares ?? [])
        );
        `;
      })
      .join("\n")}
  }`;

  return ` 
  ${libImports}
  
  ${interfaceOperationMap}
  ${interfaceApiConfig}
  ${createEndpoints}
  `;
}
