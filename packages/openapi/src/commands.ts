import { Command } from "commander";
import { generateOpenapi, generateTsAxios } from "./generate.js";
import { appLog } from "./logger.js";

export function createCommandGenerate(program: Command) {
  program
    .command("generate")
    .description("Generate Typescript and Zod files from an Openapi specified file")
    .argument("<openapi-spec>", "Relative filepath from the current cwd to the OpenApi root document file")
    .option("-o, --output [output]", "Target directory where the generated files will appear", "out")
    .option("--modelSuffix [modelSuffix]", "All model names are suffixed as provided")
    .option("--debug", "Enable debug logging")
    .action(async (spec: string, options: { output: string; modelSuffix: string; debug: boolean }) => {
      if (options.debug) {
        appLog.setLogLevel("debug");
      }
      await generateOpenapi(spec, options.output, {
        modelSuffix: options.modelSuffix,
        clearTemp: true,
      });
      appLog.log.info(`finished generate`);
    });
}

export function createCommandGenerateTs(program: Command) {
  program
    .command("generate-ts-axios")
    .description("Generate typescript source code")
    .argument("<openapi-spec>", "Relative filepath from the current cwd to the OpenApi root document file")
    .option("-o, --output [output]", "Target directory for the generated files", "out")
    .option("--modelSuffix [modelSuffix]", "All model names are suffixed as provided")
    .option("--debug", "Enable debug logging")
    .option("--templates", "If set, codegen templates will be copied into the current working directory for customization.", false)
    .action(async (spec: string, options: { output: string; modelSuffix: string; debug: boolean; templates: boolean }) => {
      if (options.debug) {
        appLog.setLogLevel("debug");
      }
      await generateTsAxios(spec, options.output, { generateZod: false, modelSuffix: options.modelSuffix, copyTemplates: options.templates });
      appLog.log.info(`finished generate`);
    });
}
