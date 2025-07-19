import { Command } from "commander";
import { EndpointDefinitionGeneratorOptions, generateEndpointDefinitions } from "./endpoint-generator.js";
import { _ } from "@dasaplan/ts-sdk";
import { appLog } from "./logger.js";

export function createCommandGenerateEndpoints(program: Command) {
  program
    .command("generate-endpoints")
    .description("Generate Openapi Endpoint interfaces")
    .argument("<openapi-spec>", "Relative filepath from the current cwd to the OpenApi root document file")
    .option("--templates [templates]", "Temporary directory which can be deleted", "tmp")
    .option("-o, --out [out]", "Target directory for the generated files", "out")
    .option("--typeSuffix [typeSuffix]", "Suffix appended to the schema name.")
    .option("--apiName [apiName]", "Name of the Api used to generate names for files or modules")
    .option("--typeNamespace [typeNamespace]", "Namespace used to index type module imports.")
    .option("--typeModuleName [typeModuleName]", "Module name for importing types.")
    .action(
      async (
        spec: string,
        options: { verbose: boolean; out: string; templates: string; typeSuffix: string; apiName: string; typeNamespace: string; typeModuleName: string },
      ) => {
        if (options.verbose) {
          appLog.setLogLevel("debug");
        }
        const tsApiTypesModule = parseApiTypesModule(options);
        await generateEndpointDefinitions(spec, {
          templatesDir: options.templates,
          outDir: options.out,
          typeSuffix: options.typeSuffix,
          apiName: options.apiName,
          tsApiTypesModule: tsApiTypesModule,
        });
      },
    );
}

function parseApiTypesModule(options: { typeNamespace?: string; typeModuleName?: string }): EndpointDefinitionGeneratorOptions["tsApiTypesModule"] {
  if (_.isNil(options.typeNamespace) && _.isNil(options.typeModuleName)) {
    return undefined;
  }
  if (options.typeNamespace && options.typeModuleName) {
    return { kind: "IMPORT_AND_NAMESPACE", namespace: options.typeNamespace, moduleName: options.typeModuleName };
  }
  if (options.typeNamespace) {
    return { kind: "NAMESPACE_WITHOUT_IMPORT", namespace: options.typeNamespace };
  }
  if (options.typeModuleName) {
    return { kind: "IMPORT_AND_NAMESPACE", namespace: "ApiTypes", moduleName: options.typeModuleName };
  }
  return undefined;
}
